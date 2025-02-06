import { otherImport } from "@/other/other-import";
/**
 * @auto-docs
 * This is a test function. The endpoint is /hello.
 * @name Hello Endpoint
 * @version 1.1.2
 */
export const hello = async (event: any) => {
  if (event.queryStringParameters && event.queryStringParameters.other) {
    return await otherImport();
  }

  /* @auto-docs
   * The return response is a User object or a message.
   * @statusCode 201
   * @schema { message: string }
   */
  return {
    message: "Go Serverless v1.0! Your function executed successfully!",
  };
};

/**
 * Bye!
 * @param event
 * @returns
 *
 * @auto-docs
 * This is a test function. The endpoint is /bye.
 * @name Bye Endpoint
 * @version 1.1.2
 * @tags bye
 * @summary This is a test function.
 */
export const bye = async (event: any) => {
  /* @auto-docs
   * The return response is a message.
   * @statusCode 201
   * @schema { message: string }
   */
  return {
    message: "Goodbye!",
  };
};
