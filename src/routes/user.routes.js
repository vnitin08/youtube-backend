import express from 'express';
import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = express.Router();

router.post('/register', registerUser);

export default router;