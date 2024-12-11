import { mImport } from "./m-import";

export const otherImport = async () => {
  console.log("otherImport");

  if ("true" === "true") {
    return await otherImport2().then((result) => {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "nested import inside then",
        }),
      };
    });
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
    const result = await mImport();

    if (result.statusCode === 400) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "nested import",
        }),
      };
    }

    return result;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "otherImport2",
    }),
  };
};
