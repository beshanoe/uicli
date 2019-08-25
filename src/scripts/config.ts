import * as fs from "fs-extra";

export function getConfig(configPath: string) {
  const config: {
    nodeSide: string[];
    entry: string;
  } = {
    nodeSide: [],
    entry: "./src/index",
    ...(fs.existsSync(configPath) ? require(configPath) : {})
  };
  return config;
}
