/**
 * @file fccore/src/Term.ts
 * @brief AST of fc-language
 *
 * Copyright 2020, HATTORI, Hiroki
 * All rights reserved.
 */
import { HC, intern } from 'ts-hashconsing/_dist/src/Data/Hashcons';


export type ModName = { kind: 'modname', name:string };


/* ************************************************************************ */
// Sorts
//   = @type | @int | @number | @string | var
export const builtin_sorts
  = [ 'type', 'int', 'number', 'string' ] as const;
export type BuiltinSorts = typeof builtin_sorts[number] ;
export type Sorts = { kind: BuiltinSorts } | { kind: 'dsort', name:string } ;




/* ************************************************************************ */
// Type
//  = Int | Number | String
//  | numeric literal | integer literal | string literal
//  | var
//  | var var+
//  | '(' Type ... ')' '->' Type        ; function
//  | '(' Type ',' Type .... ')'        ; tuple
//  | forall (var, Sotrs)+ Type
//
export type Type
  = { kind: 'Int' | 'Number' | 'String' }
  | { kind: 'tyint', val:number }
  | { kind: 'tynum', val:number }
  | { kind: 'tystr', val:string }
  | { kind: 'tyvar', name:string, imported_from: HC<ModName> }
  | { kind: 'tapp', tcon:Type, typs: HC<Type>[] }
  | { kind: 'arr', args: HC<Type>[], ret:HC<Type> }
  | { kind: 'tuple', typs:HC<Type>[] }
  | { kind: 'forall', vars: [string, HC<Sorts>][], bdy: HC<Type>} ;






/* ************************************************************************ */
// ValueTerm
//   = numeric literal | integer literal | string literal
//   | var
//   | Value Value+
//   | '\' pattern+ '->' Value
//   | ¥case (Pattern+ '->' body)+
//   | Value '?' Value ':' Value
//   | Value ':' Type
//   | 'let' (Pattern '=' Value)+ 'in' Value
//   | '(' Value ')'
//   | pre-unaryops Value
//   | Value post-unaryops
//   | Value r-binaryops Value
//   | Value l-binaryops Value
//   | Value nonassoc-binaryops
//
export type Value
  = { kind: 'numeric', val:number }
  | { kind: 'integer', val:number }
  | { kind: 'string',  val:string }
  | { kind: 'var',     name:string, index:number }
  | { kind: 'app', fnc: HC<Value>, args: HC<Value>[] }
  | { kind: 'abs', pat: HC<Pattern>[], body: HC<Value> }
  | { kind: 'case', branch: [HC<Pattern>[], HC<Value>][] }
  | { kind: 'if', cond: HC<Value>, t: HC<Value>, f: HC<Value> }
  | { kind: 'ty-anon', term: HC<Value>, typ: HC<Type> }
  | { kind: 'let', bind:[HC<Pattern>, HC<Value>][], bdy:HC<Value> } ;





/* ************************************************************************ */
// Pattern
//   = var
//   | Var Pattern*
//   | Pattern ':' Type
//   | '(' Pattern ')'
export type Pattern
  = { kind: 'patvar', name:string }
  | { kind: 'patdcon', name:string, args:HC<Pattern>[] }
  | { kind: 'pattyp', pattern:HC<Pattern>, typ:HC<Type> } ;




/* ************************************************************************ */
// Module - a top-level of module
//
//export interface Module {
//  imports: ModName & { path:string, 
//}





// : vim ts=8 sw=2 ts=80 expandtab :
