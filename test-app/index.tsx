import * as fs from "fs-extra";
import React, { useEffect, useState } from "react";
import * as fsNode from "./fs.node";

export default function() {
  const [file, setFile] = useState();
  useEffect(() => {
    fsNode.setCallback(data => {
      console.log("CB", data);
    });
    (async () => {
      setFile(
        JSON.stringify(
          await fsNode.readFile(__dirname + "/../package.json")
        )
      );
    })();
  }, []);

  function onButtonClick() {
    fs.writeFileSync(__dirname + "/foo", "hello!");
    console.log("Yep!");
  }

  return (
    <div>
      <div>
        Hello UI! {file}, {JSON.stringify("")}
      </div>
      <div>
        <button onClick={onButtonClick}>Save</button>
      </div>
    </div>
  );
}
