import { dynamicAutoDocs } from "@auto-docs/serverless-dynamic";
import * as Dynamic from "@auto-docs/serverless-dynamic";
import builder from "lambda-docs-config";

const branch = "main";

const helloBase = async (event: any) => {
  // Parse query parameters from the event
  const queryParams = event.queryStringParameters || {};

  // Scenario 1: If hello=false is set
  if (queryParams.hello === "false") {
    return {
      body: JSON.stringify({
        message: "Hello parameter is set to false!",
        status: "rejected",
      }),
      description: "Response when hello is false",
      schema: "com.drokt.RejectedMessage",
      statusCode: 400,
    };
  }

  // Scenario 2: If mood=happy is set
  if (queryParams.mood === "happy") {
    return {
      body: JSON.stringify({
        hello: "World",
        mood: "😊 Happy to see you!",
      }),
      description: "Happy mood response",
      schema: "com.drokt.HappyMessage",
      statusCode: 200,
    };
  }

  // Scenario 3: If format=xml is set
  if (queryParams.format === "xml") {
    return {
      body: "<message><hello>World</hello></message>",
      description: "XML formatted response",
      schema: "com.drokt.XmlMessage",
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml",
      },
    };
  }

  // Scenario 4: If auth=invalid is set
  if (queryParams.auth === "invalid") {
    return {
      body: JSON.stringify({
        error: "Authentication failed",
        code: "AUTH_ERROR",
      }),
      description: "Authentication error response",
      schema: "com.drokt.ErrorMessage",
      statusCode: 401,
    };
  }

  // Scenario 5: If debug=true is set
  if (queryParams.debug === "true") {
    return {
      body: JSON.stringify({
        hello: "World",
        debug: {
          timestamp: new Date().toISOString(),
          event: event,
          environment: process.env,
        },
      }),
      description: "Debug response with extra information",
      schema: "com.drokt.DebugMessage",
      statusCode: 200,
    };
  }

  // Default scenario
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
