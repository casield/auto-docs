import { response } from "@drokt/serverless";

export const mImport = async () => {
  console.log("otherImport");

  return response(
    400,
    {},
    {
      schema: {
        message: "nested import",
      },
    }
  );
};
