import { createHash } from "crypto";
import loaderUtils from "loader-utils";
import webpack = require("webpack");

const pluginName = "NodeSidePlugin";

const NodeTemplatePlugin = require("webpack/lib/node/NodeTemplatePlugin");
const NodeTargetPlugin = require("webpack/lib/node/NodeTargetPlugin");
const LibraryTemplatePlugin = require("webpack/lib/LibraryTemplatePlugin");
const SingleEntryPlugin = require("webpack/lib/SingleEntryPlugin");
const LimitChunkCountPlugin = require("webpack/lib/optimize/LimitChunkCountPlugin");

const generateHash = (str: string) =>
  createHash("md5")
    .update(str)
    .digest("hex")
    .substr(0, 8);

export function pitch(this: any, request: any) {
  if (this.uicliModuleId) {
    if (typeof this.uicliRegisterNodeModule === "function") {
      this.uicliRegisterNodeModule(this.uicliModuleId);
    }
    return `
      const { client } = require("${require.resolve("../wrappers/wrap")}");
      const wrapped = client("${this.uicliModuleId}");
      module.exports = wrapped;
    `;
  }

  const options = loaderUtils.getOptions(this) || {};

  const loaders: any[] = this.loaders.slice(this.loaderIndex + 1);

  const childFilename = "*"; // eslint-disable-line no-path-concat

  const compiler: webpack.Compiler = webpack({
    context: this.context,
    entry: this.resource,
    output: {
      filename: childFilename,
      libraryTarget: "commonjs2"
    },
    resolve: {
      extensions: [".js", ".ts", ".tsx"]
    },
    target: "node",
    module: {
      rules: [
        {
          test: /\.(t|j)sx?/,
          use: {
            loader: require.resolve("babel-loader"),
            options: {
              presets: [
                [
                  "@babel/preset-env",
                  { targets: { node: "current" }, modules: "commonjs" }
                ],
                "@babel/preset-typescript",
                "@babel/preset-react"
              ]
            }
          }
        }
      ]
    }
  });

  new LimitChunkCountPlugin({ maxChunks: 1 }).apply(compiler);

  let source: string;

  compiler.hooks.afterCompile.tap(pluginName, compilation => {
    source =
      compilation.assets[childFilename] &&
      compilation.assets[childFilename].source();
  });
  compiler.hooks.shouldEmit.tap(pluginName, () => {
    return false;
  });

  const callback = this.async();

  (compiler as any).run((err: any) => {
    if (err) {
      return callback(err);
    }

    const id = generateHash(this.resource);
    if (typeof this.uicliRegisterNodeModule === "function") {
      this.uicliRegisterNodeModule(id, source);
    }
    const result = `
      const { client } = require("${require.resolve("../wrappers/wrap")}");
      const wrapped = client("${id}");
      module.exports = wrapped;
    `;
    callback(null, result);
  });
}

export default function() {}
