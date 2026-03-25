import { Subscription, Order, Product, Server } from "../models/index.ts";
import type { Transaction } from "sequelize";
import { Op } from "sequelize";

export class SubscriptionService {
    static async createSubscription(orderId: number, transaction?: Transaction) {

        const order = await Order.findByPk(orderId, {
            include: ["product", "user"],
            transaction
        });

        if (!order) {
            throw new Error(`order not found by the following id: ${orderId}`)
        }

        const product = await Product.findByPk(order.toJSON().product_id, { transaction });

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
        expireDate.setDate(expireDate.getDate() + product.toJSON().duration_days);

        const subscription = await Subscription.create({
            user_id: order.toJSON().user_id,
            order_id: order.toJSON().id,
            server_id: server.toJSON().id,
            traffic_limit: product.toJSON().traffic_limit,
            expire_at: expireDate
        }, { transaction });

        return subscription
    }

    static async getSubscriptions(userId: number, all: boolean = false, limit: number = 10) {
        const status = all ? ["active", "expired"] : ["active"];
        const subscriptions = await Subscription.findAll({
            where:
            {
                user_id: userId,
                status: {
                    [Op.in]: status
                }
            },
            limit
        });

        return subscriptions.map(s => s.toJSON())
    }
}