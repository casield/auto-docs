const { otherImport } = require("../other/other-import");

/**
 * My Description
 * @param {*} event
 * @returns
 */
exports.hello = async (event) => {
  if (event.queryStringParameters && event.queryStringParameters.other) {
    return await otherImport();
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Go Serverless v4! Your function executed successfully!",
    }),
  };
};
