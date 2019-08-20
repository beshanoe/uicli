/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

import webpack from "webpack";

const path = require("path");
const ParserHelpers = require("webpack/lib/ParserHelpers");
const ConstDependency = require("webpack/lib/dependencies/ConstDependency");

const NullFactory = require("webpack/lib/NullFactory");

export class UICLINodeStuffPlugin implements webpack.Plugin {
  constructor(private options: any) {}

  apply(compiler: webpack.Compiler) {
    const options = this.options;
    compiler.hooks.compilation.tap(
      "NodeStuffPlugin",
      (compilation, { normalModuleFactory }) => {
        compilation.dependencyFactories.set(ConstDependency, new NullFactory());
        compilation.dependencyTemplates.set(
          ConstDependency,
          new ConstDependency.Template()
        );

        const handler = (parser: any, parserOptions: webpack.ParserOptions) => {
          if (parserOptions.node === false) return;

          let localOptions = options;
          if (parserOptions.node) {
            localOptions = Object.assign({}, localOptions, parserOptions.node);
          }

          const setConstant = (expressionName: string, value: any) => {
            parser.hooks.expression
              .for(expressionName)
              .tap("NodeStuffPlugin", () => {
                parser.state.current.addVariable(
                  expressionName,
                  JSON.stringify(value)
                );
                return true;
              });
          };

          const setModuleConstant = (
            expressionName: string,
            fn: (...args: any[]) => any
          ) => {
            parser.hooks.expression
              .for(expressionName)
              .tap("NodeStuffPlugin", () => {
                parser.state.current.addVariable(
                  expressionName,
                  JSON.stringify(fn(parser.state.module))
                );
                return true;
              });
          };
          const context = compiler.context;
          if (localOptions.__filename) {
            if (localOptions.__filename === "mock") {
              setConstant("__filename", "/index.js");
            } else {
              setModuleConstant("__filename", module => module.resource);
            }
            parser.hooks.evaluateIdentifier
              .for("__filename")
              .tap("NodeStuffPlugin", (expr: any) => {
                if (!parser.state.module) return;
                const resource = parser.state.module.resource;
                const i = resource.indexOf("?");
                return ParserHelpers.evaluateToString(
                  i < 0 ? resource : resource.substr(0, i)
                )(expr);
              });
          }
          if (localOptions.__dirname) {
            if (localOptions.__dirname === "mock") {
              setConstant("__dirname", "/");
            } else {
              setModuleConstant("__dirname", module => module.context);
            }
            parser.hooks.evaluateIdentifier
              .for("__dirname")
              .tap("NodeStuffPlugin", (expr: any) => {
                if (!parser.state.module) return;
                return ParserHelpers.evaluateToString(
                  parser.state.module.context
                )(expr);
              });
          }
          parser.hooks.expression
            .for("require.extensions")
            .tap(
              "NodeStuffPlugin",
              ParserHelpers.expressionIsUnsupported(
                parser,
                "require.extensions is not supported by webpack. Use a loader instead."
              )
            );
        };

        normalModuleFactory.hooks.parser
          .for("javascript/auto")
          .tap("NodeStuffPlugin", handler);
        normalModuleFactory.hooks.parser
          .for("javascript/dynamic")
          .tap("NodeStuffPlugin", handler);
      }
    );
  }
}
