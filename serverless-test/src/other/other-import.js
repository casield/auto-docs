export const otherImport = () => {
  console.log("otherImport");

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "otherImport",
    }),
  };
};
