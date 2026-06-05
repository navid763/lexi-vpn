import type { Request, Response } from "express";
import { AdminService } from "../services/admin.service.ts";

export class AdminController {
    static async approveOrder(req: Request, res: Response) {
        try {
            const order_id = Number(req.params.id);
            const result = await AdminService.approveOrder(order_id);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }
}