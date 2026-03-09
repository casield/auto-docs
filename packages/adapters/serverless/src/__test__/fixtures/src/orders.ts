// Fixture: stub handler for createOrder
export const createOrder = async (event: any) => ({
    statusCode: 201,
    body: JSON.stringify({ created: true }),
});
