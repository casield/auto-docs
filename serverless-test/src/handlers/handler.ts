import { response } from "@drokt/serverless";
import { otherImport } from "../other/other-import";
/**
 * My Description
 * @param {*} event
 * @returns
 */
export const hello = async (event: any) => {
  if (event.queryStringParameters && event.queryStringParameters.other) {
    return await otherImport();
  }

  return response(200, {
    message: "Go Serverless v1.0! Your function executed successfully!",
  });
};
