// Fixture: multi-layer wrapped handler
const myBusinessLogic = (event: any, context: any, callback: any) => {
    callback(null, { statusCode: 200 });
};

export const handler = withAuth(withLogging(myBusinessLogic));
