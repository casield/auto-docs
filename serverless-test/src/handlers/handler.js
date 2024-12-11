const { otherImport } = require("../other/other-import");

exports.hello = async (event) => {
  if (event.queryStringParameters && event.queryStringParameters.other) {
    return await otherImport();
  }

  return await otherImport();
};
