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
