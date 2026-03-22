import { Order, Product } from "../models/index.ts";

export class OrderService {

    static async createOrder(userId: number, productId: number) {
        const product = await Product.findByPk(productId);

        if (!product) {
            throw new Error("Product not found");
        }

        const order = await Order.create({
            user_id: userId,
            product_id: productId,
            status: "pending_payment",
            price: product.toJSON().price
        });

        return order
    }
}