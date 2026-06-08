import { prisma } from "../../config/prisma.ts";
import type { BotContext } from "../types/bot.context.ts";
import type { BotAdapter } from "../adapters/bot.adapter.ts";

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