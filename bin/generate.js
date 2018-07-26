#!/usr/bin/env node

require('babel-polyfill');
const noDeps = require('../no-dependencies-plugin');

// Manually requiring the plugins is intended. Without it the CLI may not find the correct plugins.
const plugins = [
  require('babel-plugin-transform-es2015-modules-commonjs'),
  require('babel-plugin-transform-es2015-block-scoping'),
  require('babel-plugin-transform-class-properties'),
  require('babel-plugin-transform-object-rest-spread'),
  require('babel-plugin-add-module-exports'),
  noDeps,
]

require('babel-register')({
  ignore: /node_modules\/babel/,
  babelrc: false,
  presets: ["react"],
  plugins: plugins
});

const program = require('commander');

program
  .command('generate <input-module>')
  .alias('g')
  .description('generate typings for a module, can be a relative path or an npm module')
  .option("-o, --output <name>", "Specify name of module (.d.ts will be appended if not provided)")
  .option("-N, --namespace <name>", "Specify a namespace export")
  .option("-p", "Read module name from package.json")
  .action(function(moduleName, options){
    let output = options.output;
    const path = require('path');
    const fs = require('fs');

    const relativeModulePath = path.join(process.cwd(), moduleName);

    if (fs.existsSync(relativeModulePath)) {
      moduleName = relativeModulePath;
    }

    if (!output) {
      if (options.p) {
        try {
          const package = require(path.join(moduleName, 'package.json'));
          // if the package name isn't valid we are going to be in trouble
          output = package.name + '.d.ts';
        } catch (e) {
          console.error('[~] could not find package.json in working directory');
          process.exit(1);
        }
      } else {
        console.log('[~] no output option provided, using input module name');
        output = path.basename(moduleName, path.extname(moduleName));
      }
    }

    output = output.endsWith('.d.ts')
      ? output
      : output + '.d.ts';

    console.info('[~] preparing to generate typings');

    require('../src')({
      input: moduleName,
      output: path.relative(process.cwd(), output),
      namespace: options.namespace
    });
  })

program.parse(process.argv);
