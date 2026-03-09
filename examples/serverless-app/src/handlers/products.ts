import { APIGatewayProxyHandler } from 'aws-lambda';
import { getProductById, listAllProducts, createProductRecord } from '../services/businessLogic';

/**
 * List all products with pagination and filtering
 * 
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/products","queryParams":["page","pageSize","category"],"statusCodes":[200]}
 */
export const listProducts: APIGatewayProxyHandler = async (event) => {
    const page = parseInt(event.queryStringParameters?.page || '1', 10);
    const pageSize = parseInt(event.queryStringParameters?.pageSize || '20', 10);
    const category = event.queryStringParameters?.category;

    const products = await listAllProducts({ page, pageSize, category });
    return {
        statusCode: 200,
        body: JSON.stringify(products),
    };
};

/**
 * Get a single product by ID
 * 
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/products/{id}","statusCodes":[200,404]}
 */
export const getProduct: APIGatewayProxyHandler = async (event) => {
    try {
        const productId = parseInt(event.pathParameters?.id || '0', 10);
        const product = await getProductById(productId);
        return {
            statusCode: 200,
            body: JSON.stringify(product),
        };
    } catch (error: any) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

/**
 * Create a new product listing
 * 
 * @AUTO_DOCS_META:{"httpMethod":"POST","httpPath":"/products","requestBody":"ProductCreateRequest","statusCodes":[201,400]}
 */
export const createProduct: APIGatewayProxyHandler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { name, price, category, description } = body;

        if (!name || !price) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'name and price are required' }),
            };
        }

        const product = await createProductRecord({ name, price, category, description });
        return {
            statusCode: 201,
            body: JSON.stringify(product),
        };
    } catch (error: any) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
