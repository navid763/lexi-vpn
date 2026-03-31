import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { Payment, User } from "../../models/index.ts";
import { userSteps } from "../utils/state.ts";
import { Op } from "sequelize";


const ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID);


export async function topupAmountHandler(ctx: BotContext, adapter: BotAdapter) {
    const chatId = String(ctx.chatId);

    const amount = parseInt(ctx.text || "0");

    if (isNaN(amount) || amount < 10000) {
        return adapter.sendMessage(
            ctx.chatId,
            "❌ مبلغ وارد شده نامعتبر است. لطفا یک عدد انگلیسی بزرگتر یا مساوی 10,000 وارد کنید."
        );
    }


    try {
        const user = await User.findOne({ where: { chat_id: String(ctx.chatId) } });
        if (!user) {
            return adapter.sendMessage(ctx.chatId, "❌ خطایی در یافتن اطلاعات کاربری شما رخ داد.");
        }


        const payment = await Payment.create({
            user_id: user.toJSON().id,
            order_id: null,
            amount: (amount * 10), // tooman to rial
            type: "wallet_topup",
            status: "pending"
        });

        userSteps.set(chatId, "AWAITING_TOPUP_RECEIPT");


        return adapter.sendMessage(
            ctx.chatId,
            `✅ درخواست افزایش موجودی به مبلغ ${amount.toLocaleString("fa-IR")} تومان ثبت شد.\n\n` +
            `لطفاً مبلغ را به شماره کارت زیر واریز کرده و **عکس رسید** آن را حداکثر تا 10 دقیقه در همینجا ارسال کنید:\n\n` +
            `💳 ۶۰۳۷-xxxx-xxxx-xxxx\nبه نام ...`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "لغو عملیات ❌",
                                callback_data: `CANCEL_TOPUP_AMOUNT:${payment.dataValues.id}`,
                            }
                        ]
                    ]
                }
            }
        );
    } catch (err) {
        console.error("Error in topupAmountHandler:", err);
        userSteps.delete(chatId);
        return adapter.sendMessage(ctx.chatId, "❌ خطای سیستمی رخ داد. لطفاً مجدداً از منو اقدام کنید.");
    }
}



export async function topupReceiptHandler(ctx: BotContext, adapter: BotAdapter) {
    const chatId = String(ctx.chatId);

    try {
        const user = await User.findOne({ where: { chat_id: ctx.chatId } });
        if (!user) {
            userSteps.delete(chatId);
            return
        }

        const payment = await Payment.findOne({
            where: {
                user_id: user.toJSON().id,
                type: "wallet_topup",
                status: "pending",
                created_at: {
                    [Op.gte]: Date.now() - 10 * 60 * 1000  // ۱۰ دقیقه اخیر
                }
            },
            order: [['created_at', 'DESC']]
        });

        if (!payment) {
            userSteps.delete(chatId);
            return adapter.sendMessage(ctx.chatId, "❌ درخواست شارژی یافت نشد یا قبلاً پردازش شده است و یا زمان پرداخت تمام شده است. لطفا دوباره از منو شارژ را انتخاب کنید.");
        }

        // به‌روزرسانی عکس رسید در دیتابیس (در صورت نیاز)
        // await payment.update({ receipt_image: ctx.photo });


        userSteps.delete(chatId);

        await adapter.sendMessage(
            ctx.chatId,
            "✅ رسید شارژ کیف پول دریافت شد.\n\nپس از بررسی و تایید، موجودی حساب شما افزایش خواهد یافت."
        );



        if (ADMIN_CHAT_ID) {
            await adapter.sendPhoto(
                ADMIN_CHAT_ID,
                ctx.photo!,
                `💰 درخواست افزایش موجودی کیف پول\n\n` +
                `مبلغ: ${(payment.dataValues.amount / 10).toLocaleString("fa-IR")} تومان\n` +
                `آیدی عددی کاربر: ${ctx.chatId}\n` +
                `شناسه پرداخت: ${payment.dataValues.id}`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "✅ تایید شارژ", callback_data: `APPROVE_TOPUP:${payment.dataValues.id}` },
                                { text: "❌ رد شارژ", callback_data: `REJECT_TOPUP:${payment.dataValues.id}` }
                            ]
                        ]
                    }
                }
            );
        }
    } catch (err) {
        console.error("Error in topupReceiptHandler:", err);
        userSteps.delete(chatId);
        await adapter.sendMessage(ctx.chatId, "❌ مشکلی در پردازش رسید شما به وجود آمد. لطفاً به پشتیبانی اطلاع دهید.");
    }
}
