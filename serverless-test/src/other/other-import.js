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
    const my = {
      statusCode: 200,
      body: JSON.stringify({
        message: "MyClass.MyMethod!",
      }),
    };
    /**
     * @auto-docs
     * The description of otherImport
     * @schema { superName:string, superAge:number }
     */
    return my;
  }
}
