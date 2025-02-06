import { otherImport } from "@/other/other-import";
import { response } from "@drokt/serverless";
/**
 * This is the /hello endpoint.
 */
export const hello = async (event: any) => {
  if (event.queryStringParameters && event.queryStringParameters.other) {
    return await otherImport();
  }

  /* @auto-docs
   * The return response is a User object or a message.
   * @schema { message: string } | User
   */
  return response(200, {
    message: "Go Serverless v1.0! Your function executed successfully!",
  });
};
