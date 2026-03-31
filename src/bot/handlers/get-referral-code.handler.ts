import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { User } from "../../models/index.ts";

const REWARD = Number(process.env.REFFERAL_REWARD) || 0;
export const getMyRefCodeHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    try {
        const user = await User.findOne({
            where: { chat_id: String(ctx.chatId) }
        });
        if (!user) {
            throw new Error()
        }

        const refs = await User.findAndCountAll({
            where: { invited_by: user.dataValues.id }
        });


        await adapter.sendMessage(ctx.chatId,
            `💎 با اشتراک گداری کد زیر، دوستان خود را با ما آشنا کنید. 💎

        با عضویت موفق دوستانتان مقدار 💝 ${(REWARD / 10).toLocaleString()} تومان 💝 به شما تعلق خواهد گرفت.

        تعداد دعوت موفق شما:  ${refs.count || 0}

        لینک دعوت شما:`
        );

        await adapter.sendMessage(ctx.chatId,
            `https://ble.ir/lexibot?start=${user.dataValues.referral_code}`
        );


    } catch (err) {
        console.error("error during getMyRefCodeHandler: ", err)
        return adapter.sendMessage(ctx.chatId,
            "مشکلی در پروسه پیش آمد. مجددا بعدا تلاش کنید"
        )
    }

}