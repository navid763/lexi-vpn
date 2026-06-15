import { Router } from "express";
import { OrderController } from "../controllers/order.controller.js";

const orderRouther = Router();

orderRouther.post("/", OrderController.createOrder);
export default orderRouther;
