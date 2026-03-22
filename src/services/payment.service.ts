import { Payment, Order } from "../models/index.ts";

export class PaymentService {

    static async submitPayment(
        orderId: number,
        amount: number,
        receiptImage?: string,
        destination_card?: string
    ) {

        const payment = await Payment.create({
            order_id: orderId,
            amount,
            receipt_image: receiptImage,
            destination_card: destination_card,
            status: "pending"
        });

        await Order.update(
            { status: "waiting_approval" },
            { where: { id: orderId } }
        );
        return payment
    }
}