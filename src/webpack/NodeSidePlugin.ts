import * as webpack from "webpack";
import * as Path from "path";
import * as fs from "fs-extra";

export interface NodeSideModuleInfo {
  modulePath: string;
  originalPath: string;
}

const nodeSideLoaderPath = require.resolve("./nodeSideLoader");

export class NodeSidePlugin {
  static loader = nodeSideLoaderPath;

  constructor(
    private opts: {
      nodeSideNodeModules: string[];
      onNodeSideModules(modules: { [id: string]: NodeSideModuleInfo }): void;
    }
  ) {}

  apply(compiler: webpack.Compiler) {
    const { nodeSideNodeModules, onNodeSideModules } = this.opts;

    let registeredNodeSideModules: {
      [id: string]: NodeSideModuleInfo;
    } = {};

    compiler.hooks.thisCompilation.tap("nodeSidePlugin", compilation => {
      compilation.hooks.normalModuleLoader.tap(
        "nodeSidePlugin",
        (lc, m: any) => {
          if (m.loaders.find((_: any) => _.loader === nodeSideLoaderPath)) {
            const isNodeSideNodeModule = nodeSideNodeModules.includes(
              m.rawRequest
            );
            if (isNodeSideNodeModule) {
              lc.uicliModuleId = m.rawRequest;
            }
            lc.uicliRegisterNodeModule = (moduleId: string, source: string) => {
              if (isNodeSideNodeModule) {
                registeredNodeSideModules[moduleId] = {
                  modulePath: m.rawRequest,
                  originalPath: m.rawRequest
                };
              } else {
                try {
                  const tempFileName = Path.join(
                    process.cwd(),
                    "build/.tmp",
                    Path.basename(m.resource) + ".compiled.js"
                  );
                  fs.ensureFileSync(tempFileName);
                  fs.writeFileSync(tempFileName, source);
                  registeredNodeSideModules[moduleId] = {
                    modulePath: tempFileName,
                    originalPath: m.resource
                  };
                } catch (error) {
                  console.log(error);
                }
              }
            };
          }
        }
      );
    });
    compiler.hooks.done.tap("nodeSidePlugin", () => {
      if (onNodeSideModules) {
        onNodeSideModules(registeredNodeSideModules);
      }
    });
  }
}
