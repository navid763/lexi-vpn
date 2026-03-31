import type { BotAdapter } from "../adapters/bot.adapter.ts";
import { sequelize, Payment, Product, User, Order } from "../../models/index.ts";
import { ConfigService } from "../../services/config.service.ts";
import { SubscriptionService } from "../../services/subscription.service.ts";
import type { OrderAttributes } from "../../models/order.model.ts"
import type { SubscriptionAttributes } from "../../models/subscription.model.ts";
import type { ConfigAttributes } from "../../models/config.model.ts";

interface ApproveSuccessResult {
    order: OrderAttributes;
    subscription: SubscriptionAttributes;
    config: ConfigAttributes;
}

type ApproveOrderResponse =
    | { success: true; result: ApproveSuccessResult }
    | { success: false; reason: "insufficient_balance_[approveOrderByWallet]" | "order_not_found_[approveOrderByWallet]" | "user_not_found_[approveOrderByWallet]" };

export const approveOrderByWallet = async (orderId: number, chatId: number, adapter: BotAdapter): Promise<ApproveOrderResponse> => {


    const transaction = await sequelize.transaction();

    try {
        const order = await Order.findByPk(
            orderId,
            {
                transaction,
                lock: transaction.LOCK.UPDATE
            }
        );

        if (!order) {
            await transaction.rollback();
            return { success: false, reason: "order_not_found_[approveOrderByWallet]" };
        }

        const user = await User.findOne({
            where: { chat_id: String(chatId) },
            transaction: transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!user) {
            await transaction.rollback();
            return { success: false, reason: "user_not_found_[approveOrderByWallet]" };
        }


        if (order.toJSON().price > user.toJSON().balance) {
            await adapter.sendMessage(chatId,
                `❌ موجودی کیف پول شما برای خرید این سرویس کافی نیست.

برای ادامه، کیف پول خود را شارژ کنید.
`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "افزایش اعتبار",
                                    callback_data: "INNCREASE_BALANCE",
                                },
                            ]
                        ]
                    }
                }
            );
            await Order.update(
                { status: "rejected" },
                {
                    where: { id: orderId },
                    transaction
                }
            );

            await transaction.commit();

            return { success: false, reason: "insufficient_balance_[approveOrderByWallet]" };
        }

        await User.decrement("balance", {
            by: order.toJSON().price,
            where: { id: user.toJSON().id },
            transaction
        });

        await Order.update(
            { status: "pending_payment" },
            {
                where: { id: orderId },
                transaction
            }
        );

        const payment = await Payment.create({
            user_id: user.toJSON().id,
            order_id: orderId,
            amount: order.toJSON().price,
            status: "approved",
            type: "order_payment"
        }, { transaction }
        );


        const subscription = await SubscriptionService.createSubscription(orderId, transaction);

        if (!subscription) throw new Error("subscription not found - [approveOrderByWallet]");


        const config = await ConfigService.createConfig(subscription.id, transaction);

        await Order.update(
            { status: "approved" },
            {
                where: { id: orderId },
                transaction
            }
        );

        await transaction.commit();

        return {
            success: true,
            result: {
                order: order.toJSON(),
                subscription: subscription.toJSON(),
                config: config?.toJSON(),
            }
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}