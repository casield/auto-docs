/**
 * My Description
 *
 * @returns
 */
export const otherImport = async () => {
  if (true) {
    const c = new MyClass();
    return c.myMethod();
  } else {
    /**
     * @auto-docs
     * This is another return object
     * @schema { message: string }
     * @statusCode 500
     */
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error",
      }),
    };
  }
};

class MyClass {
  constructor() {
    console.log("MyClass");
  }

  async myMethod() {
    const my = {
      statusCode: 200,
      schema: "com.drokt.User",
      body: JSON.stringify({
        userId: "123",
      }),
    };
    /**
     * @auto-docs
     * The description of otherImport
     * @schema $User
     * @statusCode 400
     */
    return my;
  }
}
