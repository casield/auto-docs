import { response } from "@auto-docs/serverless";

export const mImport = async () => {
  console.log("otherImport");

  const myResponse = response(200, {});

  return myResponse;
};
