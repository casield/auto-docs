import { response } from "@drokt/serverless";
import { mImport } from "./m-import";

export const otherImport = async () => {
  return "otherImport";
};

class MyClass {
  constructor() {
    console.log("MyClass");
  }

  async myMethod() {
    const my = response(
      200,
      {},
      {
        schema: "body",
      }
    );

    return my;
  }
}
