import { response } from "@drokt/serverless";
import { mImport } from "./m-import";

export const otherImport = async () => {
  console.log("otherImport");

  return {
    statusCode: 400,
    headers: {},
    body: JSON.stringify({
      schema: {
        message: "nested import",
      },
    }),
  };
};
