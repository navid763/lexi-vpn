// Handles extending an existing subscription's expiry date.
// Config URL stays the same — the user doesn't need to reconfigure their apps.
//
// Two entry points:
//   renewByWallet()  — instant, deducts balance + extends expiry atomically
//   createRenewalOrder() — creates a RENEWAL-type order for card payment,
//                          admin approves it, AdminService calls extendSubscription()

import { prisma } from "../config/prisma.ts";
import type { Prisma } from "@prisma/client";

export class RenewalService {

  // ── Called directly for wallet payments ──────────────────────────────────

  static async renewByWallet(subscriptionId: number, userId: number) {
    return prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          order: { include: { product: true } },
          config: true,
        },
      });

      // Re-fetch via the original order to get the product
      const originalOrder = await tx.order.findUnique({
        where: { id: subscription!.orderId },
        include: { product: true },
      });

      if (!subscription || !originalOrder) {
        throw new Error("SUBSCRIPTION_NOT_FOUND");
      }

      if (subscription.userId !== userId) {
        throw new Error("SUBSCRIPTION_NOT_OWNED");
      }

      const product = originalOrder.product;
      const price = product.price;

      // Authoritative balance check inside the transaction
      const user = await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: price } },
      });

      if (user.balance < 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Extend expiry: if still active add days to current expiry,
      // if expired restart from today
      const baseDate =
        subscription.status === "ACTIVE" && subscription.expireAt > new Date()
          ? subscription.expireAt
          : new Date();

      const newExpireAt = new Date(baseDate);
      newExpireAt.setDate(newExpireAt.getDate() + product.durationDays);

      const updatedSubscription = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          expireAt: newExpireAt,
          status: "ACTIVE", // reactivate if it was expired
        },
        include: { config: true },
      });

      // Create a renewal order record for accounting
      const renewalOrder = await tx.order.create({
        data: {
          userId,
          productId: product.id,
          price,
          type: "RENEWAL",
          status: "APPROVED",
          renewalSubscriptionId: subscriptionId,
        },
      });

      // Create a payment record
      await tx.payment.create({
        data: {
          userId,
          orderId: renewalOrder.id,
          amount: price,
          type: "ORDER_PAYMENT",
          status: "APPROVED",
        },
      });

      return { subscription: updatedSubscription, order: renewalOrder, product };
    });
  }

  // ── Called by AdminService when approving a RENEWAL-type order ────────────

  static async extendSubscription(
    subscriptionId: number,
    durationDays: number,
    orderId: number,
    tx: Prisma.TransactionClient
  ) {
    const subscription = await tx.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) throw new Error("SUBSCRIPTION_NOT_FOUND");

    const baseDate =
      subscription.status === "ACTIVE" && subscription.expireAt > new Date()
        ? subscription.expireAt
        : new Date();

    const newExpireAt = new Date(baseDate);
    newExpireAt.setDate(newExpireAt.getDate() + durationDays);

    return tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        expireAt: newExpireAt,
        status: "ACTIVE",
      },
      include: { config: true },
    });
  }

  // ── Creates a pending renewal order for card payment path ─────────────────

  static async createRenewalOrder(subscriptionId: number, userId: number) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { order: { include: { product: true } } },
    });

    if (!subscription) throw new Error("SUBSCRIPTION_NOT_FOUND");
    if (subscription.userId !== userId) throw new Error("SUBSCRIPTION_NOT_OWNED");

    const product = subscription.order.product;

    return prisma.order.create({
      data: {
        userId,
        productId: product.id,
        price: product.price,
        type: "RENEWAL",
        status: "PENDING_PAYMENT",
        renewalSubscriptionId: subscriptionId,
      },
      include: { product: true },
    });
  }
}