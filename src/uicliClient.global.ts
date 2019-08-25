import { MethodCallResult } from "./wrappers/wrapServer";

const nextId = (id => () => id++)(0);
const UICLI_CALLBACK_FN_PREFIX = "__uicli_function_";

export class UICLIClient {
  private functions = new Map<string, Function>();
  uicliSocket: WebSocket;

  constructor() {
    this.uicliSocket = new WebSocket(
      `ws://${window.location.host}:${window.location.port}/__uicli`
    );
    this.uicliSocket.addEventListener("message", event => {
      const parsed = JSON.parse(event.data);
      if (parsed.type === "callback") {
        const fn = this.functions.get(parsed.id);
        if (fn) {
          fn.call(null, ...parsed.args);
        }
      }
    });
  }

  callMethod(
    moduleName: string,
    name: string,
    ...args: any[]
  ): Promise<MethodCallResult> {
    const serializedBody = JSON.stringify(
      { type: "call", name, args },
      (_, value) => {
        if (typeof value === "function") {
          const id = `${UICLI_CALLBACK_FN_PREFIX}${nextId()}`;
          this.functions.set(id, value);
          return id;
        }
        return value;
      }
    );

    return fetch(`/api/${moduleName}/${name}`, {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: serializedBody
    }).then(_ => _.json());
  }

  getProperty(moduleName: string, name: string): Promise<MethodCallResult> {
    return fetch(`/api/${moduleName}/${name}`, {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ type: "property", name })
    }).then(_ => _.json());
  }
}

const uicliClient = new UICLIClient();

module.exports = uicliClient;
