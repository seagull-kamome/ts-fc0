/** @file src/Lexser.js
 * @brief Implement Lexer of FC language.
 *
 * Copyright 2020, HATTORI, Hiroki
 * All rights reserved.
 */

const keywords = [
  'module', 'import', 'export',
  'data', 'newtype', 'type', 'do',
  'class', 'interface', '(', ')', '{', '}', '{', '}' ] as const;
export type Token
  = typeof keywords[number]
  | 'opr' | 'quote' | 'modname' | 'sym' | 'numlit' | 'charlit'
  | 'eof' | 'bof' | 'unexpected';


const regexp_escape = (x:string):string => x.replace(/[\(\[]/g, c => '\\' + c);


export class Lexer {
  private curr_lineno = 0;
  private curr_columns = 0;
  private curr_toklen = 0;

  private curr_token: Token = 'bof';
  private curr_tokval = '';
  private curr_numval = 0;
  private curr_charval = '';

  private lex_regexp = new RegExp(
    '((?:[ \\t]|\\r?\\n)*)'                                 // [-1]:indent
    + '(?:(' + keywords.map(regexp_escape).join('|') + ')'  // [0]:kwd
    + '|([#$%&\\-=^~|@:*;+<>/?,.][#$%&\\-=^~|@:*;+<>/?(){}\[\\]]*)' // [1]:opr
    + '|([A-Z][a-zA-Z0-9_]*)'                              // [2]:modname
    + '|([a-z_][a-zA-Z0-9_]*)'                             // [3]:sym
    + '|0x([0-9a-zA-Z]+)'                                  // [4]:hexdigits
    + '|0b([01]+)'                                         // [5]:bindigits
    + '|([0-9]+(?:\\.[0-9]+))'                             // [6]:digits
    + '|(["\'])'                                           // [7]:quote
    + '|(.))'                                              // [8]:unexpected
    , 'gum');

  private quoted_regexp = new RegExp(
    '\\\\([@a-z\\\\])' // [0]:escaped
    + '|\\r?(\\n)'     // [1]:newline
    + '|\\\\U([0-9a-zA-Z]{4})'    // [2]:utf16 code unit
    + '|\\\\U\\{([0-9a-zA-z][4,8})}' // [3]:unicode code point
    + '|(.)'           // [4]:other
    , 'gum');

  constructor(private srctext:string, private filepath:string) { }

  anyToken(): Token {
    this.curr_columns += this.curr_toklen;
    const ms = this.srctext.match(this.lex_regexp);
    this.quoted_regexp.lastIndex = this.lex_regexp.lastIndex;

    if (! ms) {
      this.curr_token = 'eof';
      this.curr_toklen = 0;
      this.curr_tokval = '';
      this.curr_numval = 0;
      return 'eof';
    }

    const [ y,  spcs, ...xs ] = ms;

    // Calculate file positions whence the token beggining and ending.
    for (var ch of spcs) {
      switch (ch) {
        case ' ': ++this.curr_columns; break;
        case '\t': this.curr_columns += 8 - (this.curr_columns % 8); break;
        case '\r': break;
        case '\n': this.curr_columns = 0; ++this.curr_lineno; break;
        default: console.error('Lexser: Unknown space.'); break;
      }
    }

    const k = xs.findIndex(x => !!x);
    this.curr_tokval = xs[k];
    this.curr_toklen = y.length - spcs.length;

    [ this.curr_token, this.curr_numval = 0 ]
      = k === 0? [ this.curr_tokval as Token ]
      : k === 1? [ 'opr' ]
      : k === 2? [ 'modname' ]
      : k === 3? [ 'sym' ]
      : k === 4? [ 'numlit', parseInt(this.curr_tokval, 16) ]
      : k === 5? [ 'numlit', parseInt(this.curr_tokval, 2) ]
      : k === 6? [ 'numlit', parseInt(this.curr_tokval, 10) ]
      : k === 7? [ 'quote' ]
      : [ 'unexpected' ];

    return this.curr_token;
  }


  anyCharLit(): string|null {
    this.curr_numval = 0;

    const ms = this.srctext.match(this.quoted_regexp);
    this.lex_regexp.lastIndex = this.quoted_regexp.lastIndex;
    if (!ms) {
      this.curr_token = 'eof';
      this.curr_toklen = 0;
      this.curr_tokval = '';
      return null;
    }

    const [ y, ...xs ] = ms;
    const k = xs.findIndex(x => !!x);
    const x = xs[k];

    this.curr_tokval = y;
    this.curr_toklen = y.length;
    this.curr_charval
      = k === 0? String.fromCharCode(x.charCodeAt(0) % 32)
      : k === 1? '\n'
      : k === 2? String.fromCharCode(parseInt(x, 16))
      : k === 3? String.fromCodePoint(parseInt(x, 16))
      : x ;
    return this.curr_charval;
  }
}

  /*
export const lex_all = function* (srcstr, filepath) {
  lexer = new Lexer(srcstr, filepath);
  do {
    yield [ lexer.curr_line, lexer.curr_column, lexer.curr_tok, lexer.curr_tok_str, lexer.curr_tok_num ];
    lexer.anyToken();
  } while (lexer.curr_token !== 'eof');
}
   */
