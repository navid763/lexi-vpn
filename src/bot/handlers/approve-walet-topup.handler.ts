import { Payment, User, sequelize } from "../../models/index.ts";
import type { BotContext } from "../types/bot.context.ts";
import type { BotAdapter } from "../adapters/bot.adapter.ts";

export const approveTopupHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!ctx.callbackData) return;
    const [action, paymentIdRaw] = ctx.callbackData.split(":");
    const paymentId = Number(paymentIdRaw);

    if (isNaN(paymentId)) {
        return adapter.sendMessage(ctx.chatId, "❌ شناسه پرداخت نامعتبر است.");
    }

    const payment = await Payment.findByPk(paymentId);
    if (!payment) {
        return adapter.sendMessage(ctx.chatId, "❌ رکورد پرداخت در دیتابیس یافت نشد.");
    }

    if (payment.dataValues.status !== "pending") {
        return adapter.sendMessage(ctx.chatId, "⚠️ این درخواست شارژ قبلاً تعیین تکلیف شده است.");
    }

    const customer = await User.findByPk(payment.dataValues.user_id);
    if (!customer) {
        return adapter.sendMessage(ctx.chatId, "❌ کاربری که این درخواست را ثبت کرده یافت نشد.");
    }

    const amount = payment.dataValues.amount;



    if (action === "APPROVE_TOPUP") {
        const transaction = await sequelize.transaction();

        try {
            await payment.update({ status: "approved" }, { transaction });

            await customer.increment('balance', { by: amount, transaction });


            await transaction.commit();

            await customer.reload();
            const newBalance = customer.dataValues.balance;


            await adapter.sendMessage(
                Number(customer.dataValues.chat_id),
                `✅ شارژ کیف پول شما با موفقیت تایید و اعمال شد.\n\n` +
                `💰 مبلغ شارژ شده: ${(amount / 10).toLocaleString("fa-IR")} تومان\n` +
                `💳 موجودی فعلی شما: ${(newBalance / 10)?.toLocaleString("fa-IR")} تومان`
            );

            await adapter.sendMessage(
                ctx.chatId,
                `✅ درخواست شارژ ${(amount / 10).toLocaleString("fa-IR")} تومانی تایید شد و موجودی کاربر افزایش یافت.`
            );

        } catch (error) {
            await transaction.rollback();

            console.error("Transaction Error approving topup:", error);

            await adapter.sendMessage(
                ctx.chatId,
                "❌ خطای بحرانی در ثبت اطلاعات! تراکنش دیتابیس لغو شد تا از اشتباه مالی جلوگیری شود."
            );

            await adapter.sendMessage(
                Number(customer.dataValues.chat_id),
                "❌مشکلی در پرداخت پیش آمد. اگر مبلغی از حساب شما کسر شده باشد، حداکثر تا 48 ساعت به حساب شما بازخواهد گشت. "
            );
        }
    }

    else if (action === "REJECT_TOPUP") {
        try {
            await payment.update({ status: "rejected" });

            await adapter.sendMessage(
                Number(customer.dataValues.chat_id),
                `❌ درخواست شارژ کیف پول شما به مبلغ ${(amount / 10).toLocaleString("fa-IR")} تومان توسط مدیریت رد شد.\n\n` +
                `در صورت بروز مشکل یا اشتباه، با پشتیبانی در ارتباط باشید.`
            );

            await adapter.sendMessage(
                ctx.chatId,
                "✅ درخواست شارژ با موفقیت رد شد و به کاربر اطلاع داده شد."
            );
        } catch (error) {
            console.error("Error rejecting topup:", error);
            await adapter.sendMessage(ctx.chatId, "❌ خطا در رد شارژ. لطفاً دوباره تلاش کنید.");
        }
    }
}