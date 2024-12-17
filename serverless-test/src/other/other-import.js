import { response } from "@drokt/serverless";
import { mImport } from "./m-import";

export const otherImport = async () => {
  console.log("otherImport");

  const he = mImport();

  return he;
};
