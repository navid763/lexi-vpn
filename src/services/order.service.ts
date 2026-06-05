import { prisma } from "../config/prisma.ts";

export class OrderService {
    static async createOrder(userId: number, productId: number) {
        // findUniqueOrThrow is Prisma's cleaner alternative to manually checking
        // for null — it throws a PrismaClientKnownRequestError if not found.
        const product = await prisma.product.findUniqueOrThrow({
            where: { id: productId },
        });

        const order = await prisma.order.create({
            data: {
                userId,
                productId,
                status: "PENDING_PAYMENT",
                price: product.price,
            },
        });

        return order;
    }
}