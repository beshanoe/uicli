import { RequestHandler } from "express";
import { UICLIServer } from "../wrappers/wrapServer";

export async function executeByUrl(
  serverWrappers: UICLIServer[],
  url: string,
  body: any
) {
  const serverWrapper = serverWrappers.find(item => {
    const wrapperPath = `/api/${item.moduleName}`;
    return url.indexOf(wrapperPath) === 0;
  });
  if (serverWrapper) {
    const { type, name, args } = body;
    const result =
      type === "call"
        ? await serverWrapper.onMethodCall(name, ...args)
        : await serverWrapper.onGetProperty(name);
    return result;
  } else if (url === "/execute") {
    const { fn } = body;
    const fun = new Function(`return (${fn})()`);
    try {
      const result = fun();
      return { type: "return" as const, value: result };
    } catch (error) {
      return {
        type: "throw" as const,
        value: { message: error.message, stack: error.stack }
      };
    }
  } else {
    throw new Error(` Server wrapper not found for request "${url}"`);
  }
}

export default function uicliMiddleware(
  onRequest: () => UICLIServer[]
): RequestHandler {
  return async (req, res, next) => {
    const serverWrappers = onRequest();
    try {
      const result = await executeByUrl(serverWrappers, req.path, req.body);
      res.json(result);
    } catch (error) {
      next();
    }
  };
}
