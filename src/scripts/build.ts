import webpack from "webpack";
import { createWebpackConfig } from "../webpack/createWebpackConfig";
import * as Path from "path";
import MemoryFS from "memory-fs";
import { createShellWebpackConfig } from "../webpack/createShellWebpackConfig";
import { wrapServer, UICLIServer } from "../wrappers/wrap";
import { string } from "prop-types";

const cwdRel = (...paths: string[]) => Path.resolve(process.cwd(), ...paths);

const runWebpack = (compiler: webpack.Compiler) =>
  new Promise<webpack.Stats>((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
      }
      resolve(stats);
    });
  });

export async function build() {
  const config = require(cwdRel("uicli.json")) as { nodeSide: string[] };

  const cwd = process.cwd();

  const staticServerPath = require.resolve("./staticServer");
  const relStaticServer = (...paths: string[]) =>
    Path.join(Path.dirname(staticServerPath), ...paths);

  const virtualModules: { [path: string]: string } = {};
  const serverWrappersSources: string[] = [];
  const webpackConfig = createWebpackConfig({
    mode: "prod",
    cwd,
    entry: "./test-app/index",
    nodeSideNodeModules: config.nodeSide,
    onNodeSideModules(modules) {
      try {
        Object.entries(modules).forEach(
          ([moduleId, { isNodeModule, modulePath, content }]) => {
            if (isNodeModule) {
              serverWrappersSources.push(`
                wrapServer("${moduleId}", require("${moduleId}"), {
                  displayName: "${moduleId}"
                })
              `);
            } else {
              const virtualPath = relStaticServer("wrappers", moduleId + ".js");
              if (content) {
                virtualModules[virtualPath] = content;
              }
              serverWrappersSources.push(`
                wrapServer("${moduleId}", require("${virtualPath}"), {
                  displayName: "${modulePath}"
                })
              `);
            }
          }
        );
      } catch (error) {
        console.error(error);
      }
    }
  });

  const compiler = webpack(webpackConfig);
  const memFs = new MemoryFS();
  compiler.outputFileSystem = memFs;

  const stats = await runWebpack(compiler);
  console.log(stats.toString({ colors: true }));

  const buildFiles = memFs
    .readdirSync(cwdRel("build"))
    .filter(filename => filename.endsWith(".gz"))
    .map(filename => ({
      filename,
      content: memFs.readFileSync(cwdRel("build", filename)).toString("base64")
    }));

  const serverWrappersModulePath = relStaticServer("serverWrappers.js");
  const buildAssetsModulePath = relStaticServer("buildAssets.js");

  const shellWebpackConfig = createShellWebpackConfig({
    cwd,
    entry: staticServerPath,
    virtuals: {
      ...virtualModules,
      [serverWrappersModulePath]: `
        import { wrapServer } from "${require.resolve("../wrappers/wrap")}";
        export default [${serverWrappersSources.join(",")}]
      `,
      [buildAssetsModulePath]: `export default ${JSON.stringify(buildFiles)}`
    }
  });

  const shellCompiler = webpack(shellWebpackConfig);

  console.log("Compiling shell...");
  const shellStats = await runWebpack(shellCompiler);
  console.log(shellStats.toString({ colors: true }));
}

build();
