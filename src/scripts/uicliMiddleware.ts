import { RequestHandler } from "express";
import { UICLIServer } from "../wrappers/wrap";

export default function uicliMiddleware(
  onRequest: () => UICLIServer[]
): RequestHandler {
  return async (req, res, next) => {
    const serverWrappers = onRequest();
    const serverWrapper = serverWrappers.find(item => {
      const wrapperPath = `/api/${item.moduleName}`;
      return req.path.indexOf(wrapperPath) === 0;
    });
    if (serverWrapper) {
      const { type, name, args } = req.body;
      const result =
        type === "call"
          ? await serverWrapper.onMethodCall(name, ...args)
          : await serverWrapper.onGetProperty(name);
      res.json(result);
    } else if (req.path === "/execute") {
      const { fn } = req.body;
      const fun = new Function(`return (${fn})()`);
      try {
        const result = fun();
        return res.json({ type: "return" as const, value: result });
      } catch (error) {
        return res.json({
          type: "throw" as const,
          value: { message: error.message, stack: error.stack }
        });
      }
    } else {
      next();
    }
  };
}
