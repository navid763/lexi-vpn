import { prisma } from "../../config/prisma.js";

export async function isUserBlocked(chatId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { chatId: String(chatId) },
        select: { isBlocked: true },
    });
    return user?.isBlocked ?? false;
}