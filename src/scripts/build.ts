import webpack from "webpack";
import { createWebpackConfig } from "../webpack/createWebpackConfig";
import * as Path from "path";

const cwdRel = (path: string) => Path.resolve(process.cwd(), path);

export async function build() {
  const config = require(cwdRel("uicli.json")) as { nodeSide: string[] };

  const cwd = process.cwd();
  const webpackConfig = createWebpackConfig({
    mode: "prod",
    cwd,
    entry: "./test-app/index",
    nodeSideNodeModules: config.nodeSide,
    onNodeSideModules() {}
  });

  webpack(webpackConfig, (err, stats) => {
    if (err) {
      throw err;
    }
    console.log(stats.toString({ colors: true }));
  });
}

build();
