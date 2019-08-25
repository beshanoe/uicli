import bodyParser from "body-parser";
import express from "express";
import * as fs from "fs-extra";
import * as http from "http";
import * as Path from "path";
import tempy from "tempy";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";
import webpackHotMiddleware from "webpack-hot-middleware";
import * as WebSocket from "ws";
import { createWebpackConfig } from "../webpack/createWebpackConfig";
import { UICLIServer, wrapServer } from "../wrappers/wrapServer";
import { getConfig } from "./config";
import uicliMiddleware from "./uicliMiddleware";

const cwdRel = (path: string) => Path.resolve(process.cwd(), path);

export async function start() {
  const config = getConfig(cwdRel("uicli.json"));

  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server, path: "/__uicli" });

  let ws: WebSocket;
  wss.on("connection", (wsConnection: WebSocket) => {
    ws = wsConnection;
    console.log("WebScoket connection is opened");
  });

  app.use(
    bodyParser.json({
      reviver: (_, value) => {
        if (
          typeof value === "string" &&
          value.startsWith("__uicli_function_")
        ) {
          return function(...args: any[]) {
            if (!ws) {
              return console.error("WebSocket connection is not active");
            }
            ws.send(
              JSON.stringify({
                type: "callback",
                id: value,
                args
              })
            );
          };
        }
        return value;
      }
    })
  );

  let serverWrappers: UICLIServer[] = [];

  const cwd = process.cwd();
  const webpackConfig = createWebpackConfig({
    mode: "dev",
    cwd,
    entry: config.entry,
    nodeSideNodeModules: config.nodeSide,
    onNodeSideModules(modules) {
      try {
        serverWrappers = Object.entries(modules).map(
          ([moduleId, { isNodeModule, modulePath, content }]) => {
            if (!isNodeModule) {
              const tempFileName = tempy.file({ extension: "js" });
              fs.ensureFileSync(tempFileName);
              fs.writeFileSync(tempFileName, content);

              return wrapServer(moduleId, require(tempFileName), {
                displayName: Path.relative(cwd, modulePath)
              });
            } else {
              return wrapServer(moduleId, require(modulePath), {
                displayName: modulePath
              });
            }
          }
        );
      } catch (error) {
        console.error(error);
      }
    }
  });
  const compiler = webpack(webpackConfig);

  app.use(uicliMiddleware(() => serverWrappers));
  app.use(webpackDevMiddleware(compiler));
  app.use(webpackHotMiddleware(compiler, { reload: true }));

  server.listen(3000, () => console.log("Example app listening on port 3000!"));
}

start();
