import { prisma } from "../config/prisma.js";
import { SubscriptionService } from "./subscription.service.js";
import { ConfigService } from "./config.service.js";
import { RenewalService } from "./renewal.service.js";

export class AdminService {
    static async approveOrder(orderId: number) {
        return prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { product: true },
            });

            if (!order) {
                throw new Error("Order not found - [AdminService.approveOrder]");
            }
            if (order.status !== "WAITING_APPROVAL") {
                throw new Error("Order_Already_Processed");
            }

            const payment = await tx.payment.findFirst({ where: { orderId } });
            if (!payment) {
                throw new Error("Payment not found - [AdminService.approveOrder]");
            }

            // Approve the payment and order regardless of type
            await tx.payment.update({
                where: { id: payment.id },
                data: { status: "APPROVED" },
            });

            await tx.order.update({
                where: { id: orderId },
                data: { status: "APPROVED" },
            });

            // ── RENEWAL: extend existing subscription, no new config needed ────────
            if (order.type === "RENEWAL") {
                if (!order.renewalSubscriptionId) {
                    throw new Error("Renewal order missing renewalSubscriptionId");
                }

                const subscription = await RenewalService.extendSubscription(
                    order.renewalSubscriptionId,
                    order.product.durationDays,
                    orderId,
                    tx
                );

                // Return the existing config — user keeps the same URL
                const config = await tx.config.findUnique({
                    where: { subscriptionId: subscription.id },
                });

                return { order, subscription, config, isRenewal: true };
            }

            // ── NEW ORDER: create subscription + config as before ─────────────────
            const subscription = await SubscriptionService.createSubscription(orderId, tx);
            const config = await ConfigService.createConfig(subscription.id, tx);

            return { order, subscription, config, isRenewal: false };
        });
    }
}
