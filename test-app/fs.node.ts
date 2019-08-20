import fs from "fs";
import utils from "./utils";

export function readFile(path: string) {
  utils()
  return fs.promises.readFile(path, "utf-8");
}

export function setCallback(fn: (data: any) => void) {
  setTimeout(() => fn("aaa" + Math.random()), 1000);
}
