import { response } from "@drokt/serverless";
import { mImport } from "./m-import";

export const otherImport = async () => {
  console.log("otherImport");

  const he = mImport();

  if (he) {
    const cl = new MyClass().myMethod();
    return cl;
  }

  return he;
};

class MyClass {
  constructor() {
    console.log("MyClass");
  }

  async myMethod() {
    return response(
      200,
      {},
      {
        schema: "body",
      }
    );
  }
}
