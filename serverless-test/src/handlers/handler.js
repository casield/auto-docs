const { otherImport } = require("../other/other-import");

exports.hello = async (event) => {
  otherImport();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Go Serverless v4! Your function executed successfully!",
    }),
  };
};
