export const mImport = async () => {
  console.log("otherImport");

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "mImport",
    }),
  };
};
