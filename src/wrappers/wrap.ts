const nextId = (id => () => id++)(0);
const UICLI_CALLBACK_FN_PREFIX = "__uicli_function_";

class UICLI {
  private functions = new Map<string, Function>();

  constructor(private moduleName: string) {
    uicliSocket.addEventListener("message", event => {
      const parsed = JSON.parse(event.data);
      if (parsed.type === "callback") {
        const fn = this.functions.get(parsed.id);
        if (fn) {
          fn.call(null, ...parsed.args);
        }
      }
    });
  }

  callMethod(name: string, ...args: any[]): Promise<MethodCallResult> {
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

    return fetch(`/api/${this.moduleName}/${name}`, {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: serializedBody
    }).then(_ => _.json());
  }

  getProperty(name: string): Promise<MethodCallResult> {
    return fetch(`/api/${this.moduleName}/${name}`, {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ type: "property", name })
    }).then(_ => _.json());
  }
}

export type MethodCallResult =
  | { type: "return"; value: any }
  | { type: "throw"; value: { message: string; stack: string } };

export interface UICLIServer {
  moduleName: string;
  onMethodCall(
    name: string,
    ...args: any[]
  ): MethodCallResult | Promise<MethodCallResult>;
  onGetProperty(name: string): MethodCallResult | Promise<MethodCallResult>;
}

export const isPropertyIndicator = Symbol("isProperty");

export function client<T = any>(
  moduleName: string,
  opts: {
    initial?: any;
  } = {}
): T {
  const {
    initial = {
      toJSON() {
        return `Client-side proxy of module "${moduleName}"`;
      }
    }
  } = opts;
  const uicli = new UICLI(moduleName);

  return new Proxy(initial, {
    get(target, prop: string) {
      if (target[prop]) {
        return target[prop];
      }
      return async function(...args: any[]) {
        const isProp = args[0] === isPropertyIndicator;
        const result = isProp
          ? await uicli.getProperty(prop)
          : await uicli.callMethod(prop, ...args);
        if (result.type === "throw") {
          const error = new Error(result.value.message);
          error.stack = result.value.stack;
          throw error;
        } else if (result.type === "return") {
          return result.value;
        } else {
          throw new Error(
            `Unknown result type. Result: ${JSON.stringify(result)}`
          );
        }
      };
    }
  });
}

export function wrapServer<T extends { [name: string]: any }>(
  moduleName: string,
  moduleInstance: T,
  options: { displayName?: string } = {}
): UICLIServer {
  const { displayName = moduleName } = options;
  return {
    moduleName,
    async onMethodCall(name, ...args: any[]) {
      try {
        const member = moduleInstance[name];
        if (!member) {
          throw new Error(
            `Module "${displayName}" doesn't have a method "${name}"`
          );
        }
        const result = member.call(moduleInstance, ...args);
        if (result instanceof Promise) {
          const promiseResult = await result;
          return { type: "return" as const, value: promiseResult };
        } else {
          return { type: "return" as const, value: result };
        }
      } catch (error) {
        return {
          type: "throw" as const,
          value: { message: error.message, stack: error.stack }
        };
      }
    },
    async onGetProperty(name) {
      try {
        const member = moduleInstance[name];
        if (typeof member === "function") {
          throw new Error(
            `Property "${name} of module "${displayName}" is a function. Call it`
          );
        }
        return { type: "return" as const, value: member };
      } catch (error) {
        return {
          type: "throw" as const,
          value: { message: error.message, stack: error.stack }
        };
      }
    }
  };
}

export function asyncGet<T>(prop: T): Promise<T> {
  if (typeof prop !== "function") {
    throw new Error("Passed property should be a function");
  }
  return prop(isPropertyIndicator);
}
