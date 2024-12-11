import { mImport } from "./m-import";

export const otherImport = async () => {
  console.log("otherImport");

  if ("true" === "true") {
    return await otherImport2();
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "otherImport",
    }),
  };
};

export const otherImport2 = async () => {
  console.log("otherImport2");

  if ("true" === "true") {
    return await mImport();
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "otherImport2",
    }),
  };
};
