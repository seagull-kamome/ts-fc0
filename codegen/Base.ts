/**
 * @file
 * @brief Basic utilities for code generators.
 *
 * Copyright 2020, HATTORI, Hiroki.
 * All rights reserved.
 */
import * as FS from 'fs';

export type CodegenCfg = {
  outDir: string
  };


export function createFile(ctxt:CodegenCfg, xs:string[], ext:string): FS.WriteStream {
  let d = ctxt.outDir;
  if (xs.length > 1) {
    for (let i = 0; i < xs.length - 1; ++i)
      d = d + '/' + xs[i];
  }
  FS.mkdirSync(d, { recursive: true });
  return FS.createWriteStream(
    d + '/' + xs[xs.length - 1] + '.' + ext, { flags: 'w' });
}

// vim: ts=8 sw=2 tw=80 expandtab :
