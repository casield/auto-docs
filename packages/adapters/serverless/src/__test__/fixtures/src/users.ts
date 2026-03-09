// Fixture: stub handler for getUser
export const getUser = async (event: any) => ({
    statusCode: 200,
    body: JSON.stringify({ id: event.pathParameters?.id }),
});
