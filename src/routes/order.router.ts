import { Router } from "express";
import { OrderController } from "../controllers/order.controller.ts";

const orderRouther = Router();

orderRouther.post("/", OrderController.createOrder);
export default orderRouther;