export const otherImport = () => {
  console.log("otherImport");

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "otherImport",
    }),
  };
};

export const otherImport2 = () => {
  console.log("otherImport2");

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "otherImport2",
    }),
  };
};
