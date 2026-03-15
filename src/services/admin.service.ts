import { sequelize, Order, Payment } from "../models/index.ts";
import { SubscriptionService } from "./subscription.service.ts";
import { ConfigService } from "./config.service.ts";


export class AdminService {

    static async approveOrder(orderId: number) {

        const transaction = await sequelize.transaction();

        try {
            const order = await Order.findByPk(orderId, { transaction });
            if (!order) throw new Error("Order not found");
            if (order.status !== "waiting_approval") throw new Error("Order is not waiting for approval");

            const payment = await Payment.findOne({
                where: { order_id: orderId },
                transaction
            });
            if (!payment) throw new Error("Payment not found");

            await payment.update(
                { status: "approved" },
                { transaction }
            );

            await order.update(
                { status: "approved" },
                { transaction }
            );

            const subscription =
                await SubscriptionService.createSubscription(orderId, transaction);

            const config =
                await ConfigService.createConfig(subscription.id, transaction);

            await transaction.commit();

            return {
                order,
                subscription,
                config
            };
        } catch (error) {
            transaction.rollback();
            throw error;
        }
    }
}
