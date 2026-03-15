import { Subscription, Order, Product, Server } from "../models/index.ts";
import type { Transaction } from "sequelize";

export class SubscriptionService {
    static async createSubscription(orderId: number, transaction?: Transaction) {

        const order = await Order.findByPk(orderId, {
            include: ["product", "user"],
            transaction
        });

        if (!order) {
            throw new Error(`order not found by the following id: ${orderId}`)
        }

        const product = await Product.findByPk(order.product_id, { transaction });

        if (!product) {
            throw new Error("Product not found");
        }

        const server = await Server.findOne({
            where: { is_active: true },
            transaction
        });

        if (!server) {
            throw new Error("No active server");
        };

        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + product?.duration_days);

        const subscription = await Subscription.create({
            user_id: order.user_id,
            order_id: order.id,
            server_id: server.id,
            traffic_limit: product?.traffic_limit,
            expire_at: expireDate
        }, { transaction });

        return subscription
    }
}