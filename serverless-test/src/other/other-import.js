import { response } from "@drokt/serverless";

/**
 * My Description
 *
 * @returns
 */
export const otherImport = async () => {
  if (true) {
    const c = new MyClass();
    return c.myMethod();
  }
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
