import { Request, Response } from 'express';
import { getOrderById, getAllOrders, createOrderRecord } from '../services/businessLogic';

/**
 * Retrieve a specific order by ID
 * 
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/orders/:id"}
 */
export const getOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const orderId = parseInt(req.params.id, 10);
        return getOrderById(orderId);
    } catch (error) {
        res.status(404).json({ error: 'Order not found' });
    }
};

/**
 * Retrieve all orders for the authenticated user
 * 
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/orders","queryParams":["status","sortBy"]}
 */
export const listOrders = async (req: Request, res: Response): Promise<void> => {
    const status = req.query.status as string | undefined;
    const sortBy = req.query.sortBy as string || 'createdAt';

    return getAllOrders({ status, sortBy });
};

/**
 * Create a new order
 * 
 * @AUTO_DOCS_META:{"httpMethod":"POST","httpPath":"/orders","requestBody":"OrderCreateRequest"}
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { items, shippingAddress, paymentMethod } = req.body;
        if (!items || items.length === 0) {
            res.status(400).json({ error: 'items array cannot be empty' });
            return;
        }
        if (!shippingAddress) {
            res.status(400).json({ error: 'shippingAddress is required' });
            return;
        }
        return createOrderRecord({ items, shippingAddress, paymentMethod });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Update order status or details
 * 
 * @AUTO_DOCS_META:{"httpMethod":"PATCH","httpPath":"/orders/:id"}
 */
export const updateOrder = async (req: Request, res: Response): Promise<void> => {
    const orderId = parseInt(req.params.id, 10);
    const { status, trackingNumber } = req.body;
    res.json({ id: orderId, status, trackingNumber });
};

/**
 * Cancel an order
 * 
 * @AUTO_DOCS_META:{"httpMethod":"DELETE","httpPath":"/orders/:id"}
 */
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
    const orderId = parseInt(req.params.id, 10);
    res.json({ id: orderId, cancelled: true });
};
