import * as http from "http";
import * as Path from "path";
import * as WebSocket from "ws";
//@ts-ignore
import buildAssets from "./buildAssets"; // Virtual module
//@ts-ignore
import serverWrappers from "./serverWrappers"; // Virtual module
import { executeByUrl } from "./uicliMiddleware";

interface StaticServerOptions {
  port?: number;
}

const mimeTypeByExt = {
  js: "application/javascript",
  json: "application/json",
  html: "text/html"
};

export default async function staticServer(options: StaticServerOptions = {}) {
  const { port = 4000 } = options;

  const server = http.createServer((req, res) => {
    if (req.method === "POST") {
      let rawBody: string;
      req.on("data", chunk => {
        rawBody = chunk.toString();
      });
      req.on("end", async () => {
        const body = JSON.parse(rawBody, (_, value) => {
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
        });
        try {
          const result = await executeByUrl(
            serverWrappers,
            req.url || "",
            body
          );
          res.setHeader("Content-Type", mimeTypeByExt["json"]);
          res.end(JSON.stringify(result));
        } catch (error) {
          res.statusCode = 404;
          res.end();
        }
      });
    } else if (req.method === "GET") {
      const assetPath = req.url === "/" ? "/index.html" : req.url!;
      const content = staticAssets[assetPath + ".gz"];
      if (content) {
        const ext = Path.extname(assetPath).slice(
          1
        ) as keyof typeof mimeTypeByExt;
        res.setHeader("Content-Type", mimeTypeByExt[ext]);
        res.setHeader("Content-Encoding", "gzip");
        res.end(content);
      }
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  const wss = new WebSocket.Server({ server, path: "/__uicli" });

  let ws: WebSocket;
  wss.on("connection", (wsConnection: WebSocket) => {
    ws = wsConnection;
    console.log("WebScoket connection is opened");
  });

  const staticAssets: { [key: string]: Buffer } = {};
  (buildAssets as { filename: string; content: string }[]).forEach(
    ({ filename, content }) => {
      staticAssets["/" + filename] = Buffer.from(content, "base64");
    }
  );

  server.listen(port, () => console.log(`Example app listening on port ${port}!`));
}
