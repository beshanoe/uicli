export async function executeAsync(fn: (...args: any[]) => void) {
    if (typeof fn !== "function") {
      throw new Error("Only functions can be executed async");
    }
    const result = await fetch(`/execute`, {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ type: "execute", fn: fn.toString() })
    }).then(_ => _.json());
  
    if (result.type === "throw") {
      const error = new Error(result.value.message);
      error.stack = result.value.stack;
      throw error;
    } else if (result.type === "return") {
      return result.value;
    }
  }