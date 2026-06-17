import { prisma } from "../../config/prisma.js";
import type { BotContext } from "../types/bot.context.js";
import type { BotAdapter } from "../adapters/bot.adapter.js";

export async function requireAdmin(
    ctx: BotContext,
    adapter: BotAdapter
): Promise<boolean> {
    const isEnvAdmin = String(ctx.chatId) === String(process.env.ADMIN_CHAT_ID);

    const user = await prisma.user.findUnique({
        where: { chatId: String(ctx.chatId) },
        select: { isAdmin: true },
    });

    if (!user?.isAdmin && !isEnvAdmin) {
        await adapter.sendMessage(ctx.chatId, "دستور نامعتبر.");
        return false;
    }

    return true;
}