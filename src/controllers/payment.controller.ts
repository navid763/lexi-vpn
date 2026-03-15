import type { Request, Response } from "express";
import { PaymentService } from "../services/payment.service.ts";

export class PaymentController {

    static async submitPayment(req: Request, res: Response) {
        try {
            const { order_id, amount, destination_card, receipt_image } = req.body;

            const payment = await PaymentService.submitPayment(
                order_id,
                amount,
                destination_card,
                receipt_image
            );

            res.json(payment);

        } catch (error) {
            res.status(400).json({
                error: (error as Error).message
            });
        }
    }
}