import { prisma } from "../config/prisma.ts";

export class AdminPanelService {

    // ── Overview stats ────────────────────────────────────────────────────────

    static async getStats() {
        const [
            totalUsers,
            activeSubscriptions,
            pendingOrders,
            pendingTopups,
            todayRevenue,
        ] = await Promise.all([
            prisma.user.count({ where: { deletedAt: null } }),

            prisma.subscription.count({ where: { status: "ACTIVE", deletedAt: null } }),

            prisma.order.count({ where: { status: "WAITING_APPROVAL" } }),

            prisma.payment.count({
                where: { type: "WALLET_TOPUP", status: "PENDING" },
            }),

            // Sum of approved order payments created today
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: {
                    status: "APPROVED",
                    type: "ORDER_PAYMENT",
                    createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                },
            }),
        ]);

        return {
            totalUsers,
            activeSubscriptions,
            pendingOrders,
            pendingTopups,
            todayRevenueToman: Math.round((todayRevenue._sum.amount ?? 0) / 10),
        };
    }

    // ── User search ───────────────────────────────────────────────────────────

    static async findUsers(query: string) {
        // query can be a numeric chatId or a @username string
        const isChatId = /^\d+$/.test(query.trim());

        return prisma.user.findMany({
            where: isChatId
                ? { chatId: query.trim() }
                : { username: { contains: query.replace(/^@/, ""), mode: "insensitive" } },
            take: 10,
            orderBy: { createdAt: "desc" },
        });
    }

    // ── User detail ───────────────────────────────────────────────────────────

    static async getUserDetail(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                subscriptions: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: "desc" },
                    take: 5,
                },
                orders: {
                    orderBy: { createdAt: "desc" },
                    take: 5,
                },
            },
        });
        return user;
    }

    // ── Order detail ──────────────────────────────────────────────────────────

    static async getOrderDetail(orderId: number) {
        return prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                product: true,
                payment: true,
                subscription: { include: { config: true } },
            },
        });
    }

    // ── Manual wallet credit ──────────────────────────────────────────────────

    static async manualTopup(userId: number, amountToman: number, adminChatId: string) {
        const amountRial = amountToman * 10;

        const [payment, user] = await prisma.$transaction([
            prisma.payment.create({
                data: {
                    userId,
                    amount: amountRial,
                    type: "WALLET_TOPUP",
                    status: "APPROVED",
                    // Store a note in destinationCard field to mark it as manual
                    destinationCard: `manual_by_admin_${adminChatId}`,
                },
            }),
            prisma.user.update({
                where: { id: userId },
                data: { balance: { increment: amountRial } },
            }),
        ]);

        return { payment, user };
    }

    // ── Manual order approve / reject ─────────────────────────────────────────

    static async forceApproveOrder(orderId: number) {
        // Reuses AdminService logic — import here to avoid circular deps
        const { AdminService } = await import("./admin.service.ts");
        return AdminService.approveOrder(orderId);
    }

    static async forceRejectOrder(orderId: number) {
        const { count } = await prisma.order.updateMany({
            where: {
                id: orderId,
                status: { in: ["PENDING_PAYMENT", "WAITING_APPROVAL"] },
            },
            data: { status: "REJECTED" },
        });
        return count > 0;
    }

    // ── Broadcast ─────────────────────────────────────────────────────────────

    static async getAllUserChatIds(): Promise<string[]> {
        const users = await prisma.user.findMany({
            where: { deletedAt: null },
            select: { chatId: true },
        });
        return users.map((u) => u.chatId);
    }
}