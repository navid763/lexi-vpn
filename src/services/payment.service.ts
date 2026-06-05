import { prisma } from "../config/prisma.ts";

export class PaymentService {
    static async submitCardPayment(
        userId: number,
        orderId: number,
        amount: number,
        receiptImage?: string,
        destinationCard?: string
    ) {
        // Run both writes atomically: if the order status update fails we don't
        // want a dangling Payment row left in a pending state, and vice versa.
        const [payment] = await prisma.$transaction([
            prisma.payment.create({
                data: {
                    userId,
                    orderId,
                    amount,
                    receiptImage: receiptImage ?? null,
                    destinationCard: destinationCard ?? null,
                    status: "PENDING",
                    type: "ORDER_PAYMENT",
                },
            }),
            prisma.order.update({
                where: { id: orderId },
                data: { status: "WAITING_APPROVAL" },
            }),
        ]);

        return payment;
    }
}