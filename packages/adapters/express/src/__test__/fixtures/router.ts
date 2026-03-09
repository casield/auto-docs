// Fixture: Express router with three routes
import { Router } from "express";
import { getUsers, createUser, deleteUser } from "./handlers/users";

const router = Router();

router.get("/users", getUsers);
router.post("/users", createUser);
router.delete("/users/:id", deleteUser);

export default router;
