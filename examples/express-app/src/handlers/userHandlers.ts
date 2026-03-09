import { Request, Response } from 'express';
import { getUserById, getAllUsers, createUserRecord, updateUserRecord } from '../services/businessLogic';

/**
 * Retrieve a user by ID
 * 
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/users/:id"}
 */
export const getUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        return getUserById(userId);
    } catch (error) {
        res.status(404).json({ error: 'User not found' });
    }
};

/**
 * Retrieve all users with optional filtering
 * 
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/users","queryParams":["skip","limit","role"]}
 */
export const listUsers = async (req: Request, res: Response): Promise<void> => {
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const role = req.query.role as string | undefined;

    return getAllUsers({ skip, limit, role });
};

/**
 * Create a new user account
 * 
 * @AUTO_DOCS_META:{"httpMethod":"POST","httpPath":"/users","requestBody":"UserCreateRequest"}
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, name, role } = req.body;
        if (!email || !name) {
            res.status(400).json({ error: 'email and name are required' });
            return;
        }
        return createUserRecord({ email, name, role: role || 'user' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Update an existing user
 * 
 * @AUTO_DOCS_META:{"httpMethod":"PATCH","httpPath":"/users/:id"}
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        return updateUserRecord(userId, req.body);
    } catch (error) {
        res.status(404).json({ error: 'User not found' });
    }
};

/**
 * Delete a user account
 * 
 * @AUTO_DOCS_META:{"httpMethod":"DELETE","httpPath":"/users/:id"}
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    const userId = parseInt(req.params.id, 10);
    res.json({ success: true, message: `User ${userId} deleted` });
};
