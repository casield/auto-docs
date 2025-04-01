export const mImport = async () => {
  console.log("otherImport");

  const myResponse = {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from mImport!",
      input: process.env,
    }),
  };

  return myResponse;
};
