import type { Request, Response } from "express";
import { PaymentService } from "../services/payment.service.js";

export class PaymentController {
    static async submitPayment(req: Request, res: Response) {
        try {
            const { order_id, amount, destination_card, receipt_image, user_id } =
                req.body;

            const payment = await PaymentService.submitCardPayment(
                user_id,
                order_id,
                amount,
                receipt_image,
                destination_card
            );

            res.json(payment);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }
}
