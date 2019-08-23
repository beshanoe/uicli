import * as webpack from "webpack";

export interface NodeSideModuleInfo {
  isNodeModule?: boolean;
  modulePath: string;
  content?: string;
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
                  isNodeModule: true,
                  modulePath: m.rawRequest
                };
              } else {
                try {
                  registeredNodeSideModules[moduleId] = {
                    modulePath: m.resource,
                    content: source
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
