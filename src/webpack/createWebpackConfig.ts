import HtmlWebpackPlugin from "html-webpack-plugin";
import CompressionPlugin from "compression-webpack-plugin";
import * as Path from "path";
import * as webpack from "webpack";
import { UICLINodeStuffPlugin } from "./NodeStuffPlugin";
import { NodeSideModuleInfo, NodeSidePlugin } from "./NodeSidePlugin";
import indexHtml from "./indexHtml";

interface WebpackConfigOptions {
  mode: "dev" | "prod";
  cwd: string;
  entry: string;
  nodeSideNodeModules: string[];
  onNodeSideModules(modules: { [id: string]: NodeSideModuleInfo }): void;
}

function createBabelConfig(hotReload = true, targetNode = false) {
  const presetEnvSetting = targetNode
    ? { targets: { node: "current" }, modules: "commonjs" }
    : {
        targets: {
          browsers: ["last 2 Chrome versions"]
        },
        modules: false
      };
  return {
    presets: [
      ["@babel/preset-env", presetEnvSetting],
      "@babel/preset-typescript",
      "@babel/preset-react"
    ],
    plugins: [hotReload && "react-hot-loader/babel"].filter(Boolean)
  };
}

export function createWebpackConfig(
  options: WebpackConfigOptions
): webpack.Configuration {
  const { mode, cwd, entry, nodeSideNodeModules, onNodeSideModules } = options;
  const isDev = mode === "dev";

  return {
    mode: isDev ? "development" : "production",
    context: cwd,
    devtool: false,
    entry: {
      main: [
        isDev && require.resolve("webpack-hot-middleware/client"),
        `${__dirname}/entries/client`
      ].filter(Boolean) as string[]
    },
    output: { path: Path.join(cwd, "build") },
    resolve: {
      extensions: [".js", ".ts", ".tsx"],
      alias: {
        ...(isDev && { "react-dom": "@hot-loader/react-dom" }),
        __uicli_entry_component__: Path.join(cwd, entry)
      }
    },
    node: {
      __dirname: false,
      __filename: false,
      process: false,
      fs: false
    },
    module: {
      rules: [
        {
          test: /\.tsx?/,
          use: {
            loader: require.resolve("babel-loader"),
            options: createBabelConfig()
          }
        },
        {
          test: /\.node.(j|t)sx?/,
          use: [
            NodeSidePlugin.loader,
            {
              loader: require.resolve("babel-loader"),
              options: createBabelConfig(false, true)
            }
          ]
        },
        {
          test: /node_modules\/.*\.js$/,
          include: nodeSideNodeModules.map(_ => new RegExp(_)),
          use: {
            loader: NodeSidePlugin.loader
          }
        }
      ]
    },
    plugins: [
      new UICLINodeStuffPlugin({ __dirname: true, __filename: true }),

      new webpack.ProvidePlugin({
        console: require.resolve("../wrappers/console"),
        uicliSocket: require.resolve("../uicli")
      }),

      new HtmlWebpackPlugin({ templateContent: indexHtml() }),

      isDev && new webpack.HotModuleReplacementPlugin(),

      !isDev && new CompressionPlugin(),

      new NodeSidePlugin({ nodeSideNodeModules, onNodeSideModules })
    ].filter(Boolean) as webpack.Plugin[]
  };
}
