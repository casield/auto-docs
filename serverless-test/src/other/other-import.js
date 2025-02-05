import { response } from "@drokt/serverless";
import { mImport } from "./m-import";

/**
 * My Description
 *
 * @returns
 */
export const otherImport = async () => {
  // This is a comment
  return mImport();
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
