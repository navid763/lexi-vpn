import type { BotAdapter } from "../adapters/bot.adapter.js";
import { prisma } from "../../config/prisma.js";
import { ConfigService } from "../../services/config.service.js";
import { SubscriptionService } from "../../services/subscription.service.js";
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

    // Optimistic pre-check before opening a transaction.
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

        // FIX: use CANCELLED (not REJECTED) — REJECTED implies admin decision;
        // this is a user-side balance failure before any admin involvement.
        await prisma.order.update({
            where: { id: orderId },
            data: { status: "CANCELLED" },
        });

        return {
            success: false,
            reason: "insufficient_balance_[approveOrderByWallet]",
        };
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: user.id },
                data: { balance: { decrement: order.price } },
            });

            // Authoritative balance check inside the transaction.
            if (updatedUser.balance < 0) {
                throw new Error("CONCURRENT_BALANCE_UNDERFLOW");
            }

            // FIX: removed the redundant intermediate update to PENDING_PAYMENT
            // (the order is already PENDING_PAYMENT when it arrives here).
            // Go straight to creating the payment record.
            await tx.payment.create({
                data: {
                    userId: user.id,
                    orderId,
                    amount: order.price,
                    status: "APPROVED",
                    type: "ORDER_PAYMENT",
                },
            });

            const subscription = await SubscriptionService.createSubscription(orderId, tx);
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

            await prisma.order.update({
                where: { id: orderId },
                data: { status: "CANCELLED" },
            }).catch(() => { });

            return {
                success: false,
                reason: "insufficient_balance_[approveOrderByWallet]",
            };
        }
        throw error;
    }
};
