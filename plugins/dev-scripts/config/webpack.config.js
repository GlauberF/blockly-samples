/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Webpack configuration file.
 * @author samelh@google.com (Sam El-Husseini)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const resolve = require('resolve');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

module.exports = (env) => {
  const mode = env.mode;
  const isDevelopment = mode === 'development';
  const isProduction = mode === 'production';
  const isTypescript = fs.existsSync(resolveApp('tsconfig.json'));

  const srcEntry = `./src/index.${['js', 'ts'].find((ext) =>
    fs.existsSync(resolveApp(`./src/index.${ext}`))
  )}`;
  const testEntry = `./test/index.${['js', 'ts'].find((ext) =>
    fs.existsSync(resolveApp(`./test/index.${ext}`))
  )}`;

  return {
    mode,
    entry: isProduction ? srcEntry : testEntry,
    devtool: isProduction ? 'source-map' : 'cheap-module-source-map',
    output: {
      path: isProduction ? resolveApp('dist') : resolveApp('build'),
      publicPath: isProduction ? '/dist/' : '/build/',
      filename: isProduction ? 'index.js' : 'test_bundle.js',
      libraryTarget: 'umd',
      globalObject: 'this',
    },
    resolve: {
      alias: {
        'blockly': resolveApp('node_modules/blockly'),
      },
      extensions: ['.ts', '.js']
          .filter((ext) => isTypescript || !ext.includes('ts')),
    },
    module: {
      rules: [
        // Run the linter.
        {
          test: /\.(js|mjs|ts)$/,
          enforce: 'pre',
          use: [
            {
              options: {
                cache: true,
                emitWarning: true,
                eslintPath: require.resolve('eslint'),
                resolvePluginsRelativeTo: __dirname,
                useEslintrc: true,
              },
              loader: require.resolve('eslint-loader'),
            },
          ],
          include: [resolveApp('./src/'), resolveApp('./test/')],
        },
        // Load Blockly source maps.
        {
          test: /(blockly\/.*\.js)$/,
          use: [require.resolve('source-map-loader')],
          enforce: 'pre',
        },
        // Run babel to compile both JS and TS.
        {
          test: /\.(js|mjs|ts)$/,
          exclude: /(node_modules)/,
          loader: require.resolve('babel-loader'),
          options: {
            presets: [
              require.resolve('@babel/preset-env'),
              isTypescript && require.resolve('@babel/preset-typescript'),
            ].filter(Boolean),
            compact: isProduction,
          },
        },
      ],
    },
    plugins: [
      // Typecheck TS.
      isTypescript &&
      new ForkTsCheckerWebpackPlugin({
        typescript: resolve.sync('typescript', {
          basedir: resolveApp('node_modules'),
        }),
        async: isDevelopment,
        useTypescriptIncrementalApi: true,
        checkSyntacticErrors: true,
        tsconfig: resolveApp('tsconfig.json'),
        reportFiles: [
          '**',
        ],
        silent: true,
      }),
    ].filter(Boolean),
    externals: isProduction ? {
      'blockly/core': {
        root: 'Blockly',
        commonjs: 'blockly/core',
        commonjs2: 'blockly/core',
        amd: 'blockly/core',
      },
    } : {},
  };
};
