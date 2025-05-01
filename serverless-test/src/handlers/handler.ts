import { dynamicAutoDocs } from "@auto-docs/serverless-dynamic";
import * as Dynamic from "@auto-docs/serverless-dynamic";
import builder from "lambda-docs-config";

const branch = "main";

const helloBase = async (event: any) => {
  return {
    body: JSON.stringify({
      hello: "World",
    }),
    description: "Wow this is so cool!",
    schema: "com.drokt.HelloMessage",
    statusCode: 200,
  };
};

export const hello = dynamicAutoDocs(helloBase, builder, branch);

const byeBase = async (event: any) => {
  return {
    statusCode: 201,
    message: "Goodbye!",
  };
};

export const bye = dynamicAutoDocs(byeBase, builder, branch);

export const proxy = Dynamic.lambdaProxy();
