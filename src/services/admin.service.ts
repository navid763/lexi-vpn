import { sequelize, Order, Payment, Subscription, Config } from "../models/index.ts";
import { SubscriptionService } from "./subscription.service.ts";
import { ConfigService } from "./config.service.ts";


export class AdminService {

    static async approveOrder(orderId: number) {

        const transaction = await sequelize.transaction();

        try {
            const order = await Order.findByPk(
                orderId,
                {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                }
            );

            if (!order) throw new Error("Order not found - [services-adminservice-approveOrder]");
            if (order.toJSON().status !== "waiting_approval") {
                throw new Error("Order_Already_Processed");
            }
            const payment = await Payment.findOne({
                where: { order_id: orderId },
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (!payment) throw new Error("Payment not found - [services-adminservice-approveOrder]");

            await Payment.update(
                { status: "approved" },
                {
                    where: { id: payment.toJSON().id },
                    transaction
                }
            );

            await order.update(
                { status: "approved" },
                { transaction }
            );

            const subscription = await SubscriptionService.createSubscription(orderId, transaction);

            if (!subscription) throw new Error("subscription not found - [services-adminservice-approveOrder]");


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
                order: order.toJSON(),
                subscription: subscription.toJSON(),
                config: config?.toJSON()
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}
