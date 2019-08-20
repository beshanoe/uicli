const nodeConsole = require("./console.node");

module.exports = new Proxy(window.console, {
  get(target: any, prop) {
    return (...args: any[]) => {
      target[prop].call(target, ...args);
      nodeConsole[prop].call(nodeConsole, ...args);
    };
  }
});
