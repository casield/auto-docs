import { APIGatewayProxyHandler } from 'aws-lambda';
import { getOrderById, getAllOrders, createOrderRecord } from '../services/businessLogic';

/**
 * Retrieve a specific order by ID
 * 
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/orders/{id}","statusCodes":[200,404],"auth":"required"}
 */
export const getOrder: APIGatewayProxyHandler = async (event) => {
    try {
        const orderId = parseInt(event.pathParameters?.id || '0', 10);
        const order = await getOrderById(orderId);
        return {
            statusCode: 200,
            body: JSON.stringify(order),
        };
    } catch (error: any) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

/**
 * Retrieve all orders for the authenticated user
 * 
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/orders","queryParams":["status","sortBy"],"statusCodes":[200],"auth":"required"}
 */
export const listOrders: APIGatewayProxyHandler = async (event) => {
    const status = event.queryStringParameters?.status;
    const sortBy = event.queryStringParameters?.sortBy || 'createdAt';

    const orders = await getAllOrders({ status, sortBy });
    return {
        statusCode: 200,
        body: JSON.stringify({ orders, total: orders.length }),
    };
};

/**
 * Create a new order
 * 
 * @AUTO_DOCS_META:{"httpMethod":"POST","httpPath":"/orders","requestBody":"OrderCreateRequest","statusCodes":[201,400],"auth":"required"}
 */
export const createOrder: APIGatewayProxyHandler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { items, shippingAddress, paymentMethod } = body;

        if (!items || items.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'items array cannot be empty' }),
            };
        }

        if (!shippingAddress) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'shippingAddress is required' }),
            };
        }

        const order = await createOrderRecord({ items, shippingAddress, paymentMethod });
        return {
            statusCode: 201,
            body: JSON.stringify(order),
        };
    } catch (error: any) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

/**
 * Update order status or details
 * 
 * @AUTO_DOCS_META:{"httpMethod":"PATCH","httpPath":"/orders/{id}","statusCodes":[200,404],"auth":"required"}
 */
export const updateOrder: APIGatewayProxyHandler = async (event) => {
    const orderId = parseInt(event.pathParameters?.id || '0', 10);
    const body = JSON.parse(event.body || '{}');
    const { status, trackingNumber } = body;

    return {
        statusCode: 200,
        body: JSON.stringify({ id: orderId, status, trackingNumber }),
    };
};

/**
 * Cancel an order
 * 
 * @AUTO_DOCS_META:{"httpMethod":"DELETE","httpPath":"/orders/{id}","statusCodes":[200,404],"auth":"required"}
 */
export const cancelOrder: APIGatewayProxyHandler = async (event) => {
    const orderId = parseInt(event.pathParameters?.id || '0', 10);
    return {
        statusCode: 200,
        body: JSON.stringify({ id: orderId, cancelled: true }),
    };
};
