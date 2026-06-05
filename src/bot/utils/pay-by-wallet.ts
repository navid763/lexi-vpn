import type { BotAdapter } from "../adapters/bot.adapter.ts";
import { prisma } from "../../config/prisma.ts";
import { ConfigService } from "../../services/config.service.ts";
import { SubscriptionService } from "../../services/subscription.service.ts";
import type { Config, Order, Subscription } from "@prisma/client";

interface ApproveSuccessResult {
    order: Order;
    subscription: Subscription;
    config: Config;
}

type ApproveOrderResponse =
    | { success: true; result: ApproveSuccessResult }
    | {
        success: false;
        reason:
        | "insufficient_balance_[approveOrderByWallet]"
        | "order_not_found_[approveOrderByWallet]"
        | "user_not_found_[approveOrderByWallet]";
    };

export const approveOrderByWallet = async (
    orderId: number,
    chatId: number,
    adapter: BotAdapter
): Promise<ApproveOrderResponse> => {
    // Quick pre-checks outside the transaction so we can return early without
    // opening a transaction unnecessarily.
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
        return { success: false, reason: "order_not_found_[approveOrderByWallet]" };
    }

    const user = await prisma.user.findUnique({
        where: { chatId: String(chatId) },
    });
    if (!user) {
        return { success: false, reason: "user_not_found_[approveOrderByWallet]" };
    }

    // Check balance before opening a transaction. This is an optimistic check —
    // the authoritative check happens inside the transaction below.
    if (order.price > user.balance) {
        await adapter.sendMessage(
            chatId,
            `❌ موجودی کیف پول شما برای خرید این سرویس کافی نیست.\n\nبرای ادامه، کیف پول خود را شارژ کنید.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "افزایش اعتبار", callback_data: "INNCREASE_BALANCE" }],
                    ],
                },
            }
        );

        // Mark the order as rejected in a simple (non-transactional) update.
        await prisma.order.update({
            where: { id: orderId },
            data: { status: "REJECTED" },
        });

        return {
            success: false,
            reason: "insufficient_balance_[approveOrderByWallet]",
        };
    }

    // Everything looks good — execute the financial operations atomically.
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Decrement balance. Prisma's `decrement` generates an atomic
            // UPDATE users SET balance = balance - ? WHERE id = ?
            // so there's no race condition between reading and writing.
            const updatedUser = await tx.user.update({
                where: { id: user.id },
                data: { balance: { decrement: order.price } },
            });

            // Double-check the balance didn't go negative due to a concurrent
            // transaction (e.g. two simultaneous purchases).
            if (updatedUser.balance < 0) {
                // Throwing inside $transaction triggers automatic rollback.
                throw new Error("CONCURRENT_BALANCE_UNDERFLOW");
            }

            await tx.order.update({
                where: { id: orderId },
                data: { status: "PENDING_PAYMENT" },
            });

            await tx.payment.create({
                data: {
                    userId: user.id,
                    orderId,
                    amount: order.price,
                    status: "APPROVED",
                    type: "ORDER_PAYMENT",
                },
            });

            const subscription = await SubscriptionService.createSubscription(
                orderId,
                tx
            );
            const config = await ConfigService.createConfig(subscription.id, tx);

            await tx.order.update({
                where: { id: orderId },
                data: { status: "APPROVED" },
            });

            return { order, subscription, config };
        });

        return { success: true, result };
    } catch (error: any) {
        if (error.message === "CONCURRENT_BALANCE_UNDERFLOW") {
            await adapter.sendMessage(
                chatId,
                `❌ موجودی کیف پول شما برای خرید این سرویس کافی نیست.\n\nبرای ادامه، کیف پول خود را شارژ کنید.`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "افزایش اعتبار", callback_data: "INNCREASE_BALANCE" }],
                        ],
                    },
                }
            );
            return {
                success: false,
                reason: "insufficient_balance_[approveOrderByWallet]",
            };
        }
        // Re-throw unexpected errors so the caller can handle them.
        throw error;
    }
};