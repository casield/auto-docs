// Fixture: stub handlers for Express adapter tests
import { Request, Response } from "express";

export function getUsers(req: Request, res: Response) {
    res.json([]);
}

export function createUser(req: Request, res: Response) {
    res.status(201).json({ created: true });
}

export function deleteUser(req: Request, res: Response) {
    res.status(204).send();
}
