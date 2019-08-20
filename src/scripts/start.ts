import bodyParser from "body-parser";
import express from "express";
import * as http from "http";
import * as Path from "path";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";
import webpackHotMiddleware from "webpack-hot-middleware";
import * as WebSocket from "ws";
import { createWebpackConfig } from "../webpack/createWebpackConfig";
import { UICLIServer, wrapServer } from "../wrappers/wrap";
import uicliMiddleware from "./uicliMiddleware";

const cwdRel = (path: string) => Path.resolve(process.cwd(), path);

export async function start() {
  const config = require(cwdRel("uicli.json")) as { nodeSide: string[] };

  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server, path: "/__uicli" });

  let ws: WebSocket;
  wss.on("connection", (wsConnection: WebSocket) => {
    ws = wsConnection;
    console.log("WebScoket connection is opened");
  });

  let serverWrappers: UICLIServer[] = [];
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
  app.use(uicliMiddleware(() => serverWrappers));

  const cwd = process.cwd();
  const webpackConfig = createWebpackConfig({
    mode: "dev",
    cwd,
    entry: "./test-app/index",
    nodeSideNodeModules: config.nodeSide,
    onNodeSideModules(modules) {
      try {
        serverWrappers = Object.entries(modules).map(
          ([moduleId, { modulePath, originalPath }]) =>
            wrapServer(moduleId, require(modulePath), {
              displayName: Path.relative(cwd, originalPath)
            })
        );
      } catch (error) {
        console.error(error);
      }
    }
  });
  const compiler = webpack(webpackConfig);

  app.use(webpackDevMiddleware(compiler));
  app.use(webpackHotMiddleware(compiler, { reload: true }));

  server.listen(3000, () => console.log("Example app listening on port 3000!"));
}

start();
