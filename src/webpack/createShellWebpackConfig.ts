import VirtualModulesPlugin from "webpack-virtual-modules";
import HtmlWebpackPlugin from "html-webpack-plugin";
import * as Path from "path";
import * as webpack from "webpack";
import { UICLINodeStuffPlugin } from "./NodeStuffPlugin";
import { NodeSideModuleInfo, NodeSidePlugin } from "./NodeSidePlugin";
import indexHtml from "./indexHtml";

interface ShellWebpackConfigOptions {
  mode?: "dev" | "prod";
  cwd: string;
  entry: string;
  virtuals?: { [path: string]: string };
}

export function createShellWebpackConfig(
  options: ShellWebpackConfigOptions
): webpack.Configuration {
  const { mode = "prod", cwd, entry, virtuals } = options;
  const isDev = mode === "dev";

  return {
    mode: isDev ? "development" : "production",
    context: cwd,
    devtool: false,
    entry: {
      shell: [entry]
    },
    output: { path: Path.join(cwd, "build"), libraryTarget: "commonjs2" },
    resolve: {
      extensions: [".js", ".ts", ".tsx"]
    },
    target: "node",
    node: {
      bufferutil: "mock"
    },
    module: {
      rules: [
        {
          test: /\.(t|j)sx?/,
          exclude: /node_modules/,
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
    },
    plugins: [
      new VirtualModulesPlugin(virtuals),
      new webpack.IgnorePlugin(/(bufferutil|utf-8-validate)/)
    ].filter(Boolean) as webpack.Plugin[]
  };
}
