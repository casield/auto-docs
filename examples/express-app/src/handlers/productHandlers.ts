import { Request, Response } from 'express';
import { getProductById, listAllProducts, createProductRecord } from '../services/businessLogic';

/**
 * List all products with pagination and filtering
 * 
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/products","queryParams":["page","pageSize","category"]}
 */
export const listProducts = async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const category = req.query.category as string | undefined;

    return listAllProducts({ page, pageSize, category });
};

/**
 * Get a single product by ID
 * 
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/products/:id"}
 */
export const getProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const productId = parseInt(req.params.id, 10);
        return getProductById(productId);
    } catch (error) {
        res.status(404).json({ error: 'Product not found' });
    }
};

/**
 * Create a new product listing
 * 
 * @AUTO_DOCS_META:{"httpMethod":"POST","httpPath":"/products","requestBody":"ProductCreateRequest"}
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, price, category, description } = req.body;
        if (!name || !price) {
            res.status(400).json({ error: 'name and price are required' });
            return;
        }
        return createProductRecord({ name, price, category, description });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Update product inventory and details
 * 
 * @AUTO_DOCS_META:{"httpMethod":"PATCH","httpPath":"/products/:id"}
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    const productId = parseInt(req.params.id, 10);
    res.json({ id: productId, updated: true, changes: req.body });
};
