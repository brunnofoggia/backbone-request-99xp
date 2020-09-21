import babel from 'rollup-plugin-babel';
import { eslint } from 'rollup-plugin-eslint';
import json from 'rollup-plugin-json';
import { terser } from 'rollup-plugin-terser';
// import builtins from 'rollup-plugin-node-builtins';
// import globals from 'rollup-plugin-node-globals';

import { version } from './package.json';

const _globals = {
  'v8n-99xp': 'v8n',
  'underscore-99xp': '_',
  'validate-99xp': 'v',
  'backbone': 'Backbone',
  'http': 'http',
  'https': 'https',
  'app-exception': 'AppException'
};

const externals = ['backbone','http','https','v8n-99xp','validate-99xp','underscore-99xp', 'app-exception'];

const now = new Date();
const year = now.getFullYear();

const banner = `/**
* @license
* backbone-request 99xp
* ----------------------------------
* v${version}
*
* Copyright (c)${year} Bruno Foggia, 99xp.
* Distributed under MIT license
*
* https://backbone-request.99xp.org
*/\n\n`;

const footer = '';

export default [
  {
    input: 'src/backbone-request-99xp.js',
    external: externals,
    output: [
      {
        file: 'lib/backbone-request-99xp.js',
        format: 'umd',
        name: 'BackboneRequest',
        exports: 'named',
        sourcemap: true,
        globals: _globals,
        banner,
        footer
      },
      {
        file: 'lib/backbone-request-99xp.esm.js',
        format: 'es'
      }
    ],
    plugins: [
      eslint({ exclude: ['package.json'] }),
      json(),
      babel()
    ]
  },
  {
    input: 'src/backbone-request-99xp.js',
    external: externals,
    output: [
      {
        file: 'lib/backbone-request-99xp.min.js',
        format: 'umd',
        name: 'BackboneRequest',
        exports: 'named',
        sourcemap: true,
        globals: _globals,
        banner,
        footer
      }
    ],
    plugins: [
      json(),
      babel(),
      terser({ output: { comments: /@license/ }})
    ]
  }
]
