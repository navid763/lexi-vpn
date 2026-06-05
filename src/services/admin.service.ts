import { prisma } from "../config/prisma.ts";
import { SubscriptionService } from "./subscription.service.ts";
import { ConfigService } from "./config.service.ts";

export class AdminService {
    static async approveOrder(orderId: number) {
        return prisma.$transaction(async (tx) => {
            // Lock the row for the duration of this transaction.
            // PostgreSQL supports SELECT ... FOR UPDATE via Prisma's findFirst with
            // a raw query, but for most apps an optimistic check is sufficient.
            const order = await tx.order.findUnique({ where: { id: orderId } });

            if (!order) {
                throw new Error("Order not found - [AdminService.approveOrder]");
            }
            if (order.status !== "WAITING_APPROVAL") {
                throw new Error("Order_Already_Processed");
            }

            const payment = await tx.payment.findFirst({
                where: { orderId },
            });
            if (!payment) {
                throw new Error("Payment not found - [AdminService.approveOrder]");
            }

            // Update payment and order status
            await tx.payment.update({
                where: { id: payment.id },
                data: { status: "APPROVED" },
            });

            await tx.order.update({
                where: { id: orderId },
                data: { status: "APPROVED" },
            });

            // Create the subscription and config within the same transaction
            const subscription = await SubscriptionService.createSubscription(orderId, tx);
            const config = await ConfigService.createConfig(subscription.id, tx);

            return { order, subscription, config };
        });
    }
}
