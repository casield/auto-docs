import { response } from "@drokt/serverless";

export const mImport = async () => {
  console.log("otherImport");

  const myResponse = response(
    200,
    {},
    {
      plugin: "",
    }
  );

  return myResponse;
};
