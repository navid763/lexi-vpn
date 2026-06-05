import { prisma } from "../config/prisma.ts";
import type { Prisma } from "@prisma/client";

export class SubscriptionService {
    static async createSubscription(
        orderId: number,

        tx?: Prisma.TransactionClient
    ) {

        const db = tx ?? prisma;

        const order = await db.order.findUniqueOrThrow({
            where: { id: orderId },
            include: { product: true, user: true },
        });

        const server = await db.server.findFirst({
            where: { isActive: true },
        });

        if (!server) {
            throw new Error("No active server available");
        }

        const expireAt = new Date();
        expireAt.setDate(expireAt.getDate() + order.product.durationDays);

        const subscription = await db.subscription.create({
            data: {
                userId: order.userId,
                orderId: order.id,
                serverId: server.id,
                trafficLimit: order.product.trafficLimit,
                expireAt,
                status: "ACTIVE",
            },
        });

        return subscription;
    }

    static async getSubscriptions(
        userId: number,
        all: boolean = false,
        limit: number = 10
    ) {
        const statusFilter = all
            ? { in: ["ACTIVE", "EXPIRED"] as const }
            : { equals: "ACTIVE" as const };

        const subscriptions = await prisma.subscription.findMany({
            where: {
                userId,
                status: statusFilter,
                deletedAt: null,
            },
            take: limit,
        });

        return subscriptions;
    }
}