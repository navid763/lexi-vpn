import type { Request, Response } from "express";
import { OrderService } from "../services/order.service.ts";

export class OrderController {

    static async createOrder(req: Request, res: Response) {
        try {
            const { user_id, product_id } = req.body;

            const order = await OrderService.createOrder(user_id, product_id);
            res.json(order);

        } catch (error) {
            res.status(400).json({
                error: (error as Error).message
            });
        }
    }
}