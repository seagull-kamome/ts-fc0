
import * as JS0 from '../src/Js0.js';


var outbuf = '';
const outf = (str:string) => (outbuf += str);

let m
  = new JS0.Module('hello.js')
  .importFrom('fs', 'FS');
const c = JS0.constVar('console');
m.addStatement(JS0.app(JS0.fldref(c, 'log'), [ JS0.lit('Hello, World') ]) );

const fib0 = JS0.constVar('fib0');
m.addExport(fib0, lam(['x'], ([varx]) => {
  let bdy:HC<Statement>[] = [];
  JS0.If(JS0.binop('<', varx, 0), JS0.Return(JS0.lit(undefined)), null);
  JS0.If(JS0.binop('===', varx, 0), JS0.Return(0), null);
  JS0.If(JS0.binop('===', varx, 1), JS0.Return(1), null);
  JS0.Return(
    JS0.binop('+',
      JS0.app(fib0, [JS0.binop('-', varx, 1)]),
      JS0.app(fib0, [JS0.binop('-', varx, 2)]) ));
}));


m.render(outf);
console.log(outbuf);


