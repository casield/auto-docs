import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
    getUser,
    listUsers,
    createUser,
    updateUser,
    deleteUser,
} from '../handlers/userHandlers';
import {
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
} from '../handlers/productHandlers';
import {
    getOrder,
    listOrders,
    createOrder,
    updateOrder,
    cancelOrder,
} from '../handlers/orderHandlers';

const router = Router();

// User routes
router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.post('/users', createUser);
router.patch('/users/:id', authMiddleware, updateUser);
router.delete('/users/:id', authMiddleware, deleteUser);

// Product routes
router.get('/products', listProducts);
router.get('/products/:id', getProduct);
router.post('/products', authMiddleware, createProduct);
router.patch('/products/:id', authMiddleware, updateProduct);

// Order routes (all protected with auth)
router.get('/orders', authMiddleware, listOrders);
router.get('/orders/:id', authMiddleware, getOrder);
router.post('/orders', authMiddleware, createOrder);
router.patch('/orders/:id', authMiddleware, updateOrder);
router.delete('/orders/:id', authMiddleware, cancelOrder);

export default router;
