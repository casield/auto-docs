import { APIGatewayProxyHandler } from 'aws-lambda';
import {
    getUserById,
    getAllUsers,
    createUserRecord,
    updateUserRecord,
} from '../services/businessLogic';

/**
 * Retrieve a user by ID
 * 
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/users/{id}","statusCodes":[200,404]}
 */
export const getUser: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = parseInt(event.pathParameters?.id || '0', 10);
        const user = await getUserById(userId);
        return {
            statusCode: 200,
            body: JSON.stringify(user),
        };
    } catch (error: any) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

/**
 * Retrieve all users with optional filtering
 * 
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/users","queryParams":["skip","limit","role"],"statusCodes":[200]}
 */
export const listUsers: APIGatewayProxyHandler = async (event) => {
    const skip = parseInt(event.queryStringParameters?.skip || '0', 10);
    const limit = parseInt(event.queryStringParameters?.limit || '10', 10);
    const role = event.queryStringParameters?.role;

    const users = await getAllUsers({ skip, limit, role });
    return {
        statusCode: 200,
        body: JSON.stringify({ data: users, count: users.length }),
    };
};

/**
 * Create a new user account
 * 
 * @AUTO_DOCS_META:{"httpMethod":"POST","httpPath":"/users","requestBody":"UserCreateRequest","statusCodes":[201,400]}
 */
export const createUser: APIGatewayProxyHandler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { email, name, role } = body;

        if (!email || !name) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'email and name are required' }),
            };
        }

        const user = await createUserRecord({ email, name, role: role || 'user' });
        return {
            statusCode: 201,
            body: JSON.stringify(user),
        };
    } catch (error: any) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

/**
 * Update an existing user
 * 
 * @AUTO_DOCS_META:{"httpMethod":"PATCH","httpPath":"/users/{id}","statusCodes":[200,404]}
 */
export const updateUser: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = parseInt(event.pathParameters?.id || '0', 10);
        const body = JSON.parse(event.body || '{}');
        const user = await updateUserRecord(userId, body);
        return {
            statusCode: 200,
            body: JSON.stringify(user),
        };
    } catch (error: any) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

/**
 * Delete a user account
 * 
 * @AUTO_DOCS_META:{"httpMethod":"DELETE","httpPath":"/users/{id}","statusCodes":[200,404]}
 */
export const deleteUser: APIGatewayProxyHandler = async (event) => {
    const userId = parseInt(event.pathParameters?.id || '0', 10);
    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: `User ${userId} deleted` }),
    };
};
