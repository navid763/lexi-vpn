import { prisma } from "../../config/prisma.js";
import type { BotContext } from "../types/bot.context.js";
import type { BotAdapter } from "../adapters/bot.adapter.js";

export async function requireAdmin(
    ctx: BotContext,
    adapter: BotAdapter
): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { chatId: String(ctx.chatId) },
        select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
        // Silent fail — don't confirm the command exists to non-admins
        await adapter.sendMessage(ctx.chatId, "دستور نامعتبر.");
        return false;
    }

    return true;
}
