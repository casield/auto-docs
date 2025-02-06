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
        userId: "123",
      }),
    };
    /**
     * @auto-docs
     * The description of otherImport
     * @schema $User
     */
    return my;
  }
}
