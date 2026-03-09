// Fixture: a Lambda handler wrapped in Middy
const myBusinessLogic = (event: any, context: any, callback: any) => {
    callback(null, { statusCode: 200, body: '{"ok":true}' });
};

export const handler = middy(myBusinessLogic);
