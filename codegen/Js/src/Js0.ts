/**
 * @file
 * @brief AST and code renderer of JS0; a simple Javascript code generator.
 *
 * Copyright 2020, HATTORI, Hiroki.
 * All rights reserved.
 */
//import * as FS from 'fs';
import { HC, intern } from 'ts-hashconsing/_dist/src/Data/Hashcons.js';
import * as CGEN from '../../Base.js'


export type CodegenCfg = CGEN.CodegenCfg & {};

/* ************************************************************************ */
// AST

export type PreUnaryOpr = '-' | '!' | '--' | '++';
export type PostUnaryOpr = '--' | '++';
export type BinaryOpr
  = '+' | '-' | '*' | '/' | '%' | '**'
  | '==' | '!=' | '===' | '!==' | '>' | '>=' | '<' | '<='
  | '=' | '+=' | '-=' | '*=' | '/=' | '**=' | 'in';

type OprAssoc = { assoc: 'l'|'r'|'n', prio: number };
const oprl = (n:number) => ({ assoc: 'l', prio: n }) as OprAssoc;
const oprr = (n:number) => ({ assoc: 'r', prio: n }) as OprAssoc;
const oprn = (n:number) => ({ assoc: 'n', prio: n }) as OprAssoc;

const binopr_prio = {
  '=': oprr(3), '+=': oprr(3), '-=': oprr(3), '*=': oprr(3), '/=': oprr(3), '**=': oprr(3),
  '==': oprn(11), '!=': oprn(11), '===': oprn(11), '!==': oprn(11),
  'in': oprl(12), '>': oprn(12), '>=': oprn(12), '<': oprn(12), '<=': oprn(12),
  '+': oprl(14), '-': oprl(14),
  '*': oprl(15), '/': oprl(15), '%': oprl(15),
  '**': oprr(16) };
const preunaryopr_prio = { '-': oprr(17), '!': oprr(17), '--': oprr(17), '++': oprr(17) };
const postunaryopr_prio = { '--': oprn(18), '++': oprn(18) };

export type Field = { name: string };
export type Expr
  = { kind: 'lit', val:undefined|null|string|number }
  | { kind: 'preunaryopr', opr:PreUnaryOpr, rhs:HC<Expr> }
  | { kind: 'postunaryopr', opr:PostUnaryOpr, lhs:HC<Expr> }
  | { kind: 'binaryopr', opr:BinaryOpr, lhs:HC<Expr>, rhs:HC<Expr> }
  | { kind: '?:', cond:HC<Expr>, t:HC<Expr>, f:HC<Expr> }
  | { kind: 'abs', args:HC<VarRef>[], bdy:HC<Block>|HC<Expr> }
  | { kind: 'app', fn:HC<Expr>, params:HC<Expr>[] }
  | { kind: 'fld', obj:HC<Expr>, fld:HC<Field> }
  | { kind: '[]', obj:HC<Expr>, idx:HC<Expr> }
  | CVarRef
  | VarRef ;

export type Block = { kind: 'block', bdy:HC<Statement>[] };
export type Statement
  = { kind: 'if', cond:HC<Expr>, bdy:HC<Statement>, f:HC<Statement>|null }
  | { kind: 'while', cond:HC<Expr>, bdy:HC<Statement> }
  | { kind: 'do-while', cond:HC<Expr>, bdy:HC<Statement> }
  | { kind: 'return', val:HC<Expr> }
  | Expr
  | Block
  | Decl ;


export type CVarRef = { kind: 'const', name:string };
export type VarRef = { kind: 'let', name:string };
export type Decl
  = { kind: 'vardecl', exposed:boolean, varref:HC<VarRef>|HC<CVarRef>, init:HC<Expr>|null } ;


/* ************************************************************************ */
// DSLs
type anyExpr = undefined|null|string|number|HC<Expr>;
const fromAnyExpr = (x:anyExpr):HC<Expr> => {
  return (x === null || typeof x ==='undefined' || typeof x === 'string' || typeof x === 'number')? lit(x) : x;
}


export const varRef = (name:string):HC<VarRef> => intern({ kind:'let', name: name});
export const constVar = (name:string):HC<CVarRef> => intern({ kind:'const', name: name});
export const lit = (v:undefined|null|string|number):HC<Expr> => intern({ kind:'lit', val:v });
export const fldref = (obj:anyExpr, name:string):HC<Expr> =>
  intern({ kind:'fld', obj:fromAnyExpr(obj), fld:intern({ name: name }) });
export const binop = (op:BinaryOpr, lhs:anyExpr, rhs:anyExpr):HC<Expr> =>
  intern({ kind:'binaryopr', opr:op, lhs:fromAnyExpr(lhs), rhs:fromAnyExpr(rhs) });
export const app = (fn:HC<Expr>, params:anyExpr[]):HC<Expr> =>
  intern({ kind: 'app', fn:fn, params:params.map(fromAnyExpr) });
export const lam = (args:string[], bdy:(xs:HC<VarRef>[]) => (HC<Expr>|HC<Block>)):HC<Expr> => {
  const xs = args.map(varRef);
  return intern({ kind: 'abs', args:xs, bdy:bdy(xs) }); }


export const mkBlock = (bdy:HC<Statement>[]):HC<Block> => intern({ kind:'block', bdy:bdy });

export const mkDecl = (varref:HC<VarRef>, init:HC<Expr>|null, expose:boolean=false):HC<Decl> =>
  intern({ kind:'vardecl', exposed:expose, varref:varref, init:init });
export const mkExport = (varref:HC<VarRef>, init:HC<Expr>|null):HC<Decl> => mkDecl(varref, init, true);

export const If = (cond:HC<Expr>, t:HC<Statement>, f:HC<Statement>):HC<Statement> =>
  intern({ kind:'if', cond:cond, bdy:t, f:f });
export const Return = (v:anyExpr):HC<Statement> => intern({ kind: 'return', val:fromAnyExpr(v) });


/* ************************************************************************ */
// Module

const SW = 2;

export class Module {
  private imports: { alias:string, modpath:string }[] = [];
  block: Block = { kind: 'block', bdy: [] };

  constructor(private name:string) { }

  importFrom(modpath:string, alias:string):Module {
    this.imports.push({ alias: alias, modpath: modpath }); return this; }

  addStatement(x:HC<Statement>):Module { this.block.bdy.push(x); return this; }
  addDecl(varref:HC<VarRef>, init:HC<Expr>|null, expose:boolean=false):Module {
    this.block.bdy.push(mkDecl(varref, init, expose));
    return this; }
  addExport(varref:HC<VarRef>, init:HC<Expr>|null):Module {
    this.block.bdy.push(mkDecl(varref, init, true));
    return this; }


  render(f:(s:string) => void): void {
    let indentLevel = 0;
    const indent = (x = '') => f('\n' + ' '.repeat(SW * indentLevel) + x);

    function renderStatement(stmt:Statement):void {
      switch (stmt.kind) {
        case 'block':
          f('{'); ++indentLevel;
          stmt.bdy.forEach(x => { indent(); renderStatement(x); });
          --indentLevel;
          return indent('}');
        case 'if': case 'while':
          indent(stmt.kind + ' '); renderExpr(stmt.cond, oprn(99), 'l');
          renderStatement(stmt.bdy);
          if (stmt.kind === 'if' && stmt.f !== null) {
            indent('else');
            renderStatement(stmt.f);
          }
          return ;
        case 'do-while':
          indent('do {'); ++indentLevel; renderStatement(stmt.bdy); --indentLevel;
          indent('} while ');
          return renderExpr(stmt.cond, oprn(99), 'l');
        case 'return':
          indent(stmt.kind + ' ');
          return renderExpr(stmt.val, oprn(0), 'l'); f(';');
        case 'vardecl':
          indent();
          f((stmt.exposed? 'export ':'') + stmt.varref.kind + ' ' + stmt.varref.name);
          if (stmt.init !== null) { f(' = '); renderExpr(stmt.init, oprr(3), 'r'); }
          return f(';');

        default: indent(''); return renderExpr(stmt, oprn(0), 'l'); f(';');
      }
    }


    function renderExpr(expr:Expr, assc:OprAssoc, lrn:'l'|'r'):void {
      const parens = (x:OprAssoc, h:() => void) => {
        const ys = (x.prio < assc.prio)? [ '(', ')' ] : [ '', '' ];
        f(ys[0]); h(); f(ys[1]); };

      switch (expr.kind) {
        case 'lit':
          return f(expr.val === undefined? 'undefined' : JSON.stringify(expr.val));
        case 'preunaryopr':
          f(expr.opr + ' ');
          return renderExpr(expr.rhs, preunaryopr_prio[expr.opr], 'r');
        case 'postunaryopr':
          renderExpr(expr.lhs, postunaryopr_prio[expr.opr], 'l');
          return f(expr.opr + ' ');

        case 'binaryopr':
          {
            const x = binopr_prio[expr.opr];
            return parens(x, () => {
              renderExpr(expr.lhs, x, 'l');
              f(' ' + expr.opr + ' ');
              renderExpr(expr.rhs, x, 'r'); });
          }

        case '?:':  // oprr(4)
          return parens(oprr(4), () => {
            renderExpr(expr.cond, oprr(4), 'l'); f('? ');
            renderExpr(expr.t, oprr(4), 'r'); f(': ');
            renderExpr(expr.f, oprr(4), 'r'); });

        case 'abs':
          return parens(oprn(0), () => {
            f('(' + expr.args.map(x => x.name).join(', ') + ') => ');
            if (expr.bdy.kind == 'block') {
              renderStatement(expr.bdy);
            } else {
              renderExpr(expr.bdy, oprn(0), 'r');
            } });

        case 'app':  // oprl(20)  (comma is oprl(1)
          return parens(oprl(20), () => {
            renderExpr(expr.fn, oprl(20), 'l');
            f('(');
            expr.params.forEach((x:HC<Expr>, i:number) => {
              if (i > 0) f(', ');
              renderExpr(x, oprl(1), (i === 0? 'l' : 'r')); });
            f(')'); });

        case 'fld': // '.': oprl(20)
          return parens(oprl(20), () => {
            renderExpr(expr.obj, oprl(20), 'l');
            f('.' + expr.fld.name); });

        case '[]':  // '[...]': oprl(20)
          return parens(oprl(20), () => {
            renderExpr(expr.obj, oprl(20), 'l');
            f('[');
            renderExpr(expr.idx, oprl(0), 'l');
            f(']'); });

        case 'const': case 'let': return f(expr.name);
      }
    }


    f('// ' + this.name);
    this.imports.forEach(x => {
      indent(); f('import * as ' + x.alias + ' from ' + x.modpath + ';'); });
    f('\n');
    this.block.bdy.forEach(renderStatement);
    f('\n// EOF\n');
  }
};

/*
export const save_module(ctxt:CodegenCtxt, x:Module) {
  let writer = FS.createWriteStream();

}
 */


