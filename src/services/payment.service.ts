import { Payment, Order } from "../models/index.ts";

export class PaymentService {

    static async submitCardPayment(
        userId: number,
        orderId: number,
        amount: number,
        receiptImage?: string,
        destination_card?: string
    ) {

        const payment = await Payment.create({
            user_id: userId,
            order_id: orderId,
            amount,
            receipt_image: receiptImage || null,
            destination_card: destination_card || null,
            status: "pending"
        });

        await Order.update(
            { status: "waiting_approval" },
            { where: { id: orderId } }
        );
        return payment
    }
}