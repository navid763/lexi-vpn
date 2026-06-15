import { prisma } from "../config/prisma.js";
import { Prisma } from "@prisma/client";

export class PaymentService {
    static async submitCardPayment(
        userId: number,
        orderId: number,
        amount: number,
        receiptImage?: string,
        destinationCard?: string
    ) {
        try {
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
        } catch (err) {

            if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code === "P2002"
            ) {
                throw new Error("PAYMENT_ALREADY_EXISTS");
            }
            throw err;
        }
    }
}
