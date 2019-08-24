import { UICLIClient } from "../uicliClient.global";

export const isPropertyIndicator = Symbol("isProperty");

declare const uicliClient: UICLIClient;

export function wrapClient<T = any>(
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

  return new Proxy(initial, {
    get(target, prop: string) {
      if (target[prop]) {
        return target[prop];
      }
      return async function(...args: any[]) {
        const isProp = args[0] === isPropertyIndicator;
        const result = isProp
          ? await uicliClient.getProperty(moduleName, prop)
          : await uicliClient.callMethod(moduleName, prop, ...args);
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
