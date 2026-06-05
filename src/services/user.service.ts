import { prisma } from "../config/prisma.ts";
import * as crypto from "crypto";

function generateUniqueCode(): string {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
}

const REWARD = Number(process.env.REFFERAL_REWARD) || 0; // Rials

export class UserService {
    static async getOrCreateUser(
        chatId: number,
        messenger: "telegram" | "bale",
        fullName?: string,
        username?: string,
        referralPayload?: string
    ) {

        let user = await prisma.user.findUnique({
            where: { chatId: String(chatId) },
        });

        let rewardOptions = null;

        if (!user) {

            let invitedById: number | undefined;

            if (referralPayload) {
                const referrer = await prisma.user.findUnique({
                    where: { referralCode: referralPayload },
                });

                if (referrer) {
                    invitedById = referrer.id;


                    await prisma.user.update({
                        where: { id: referrer.id },
                        data: { balance: { increment: REWARD } },
                    });

                    rewardOptions = {
                        rewardOwnerChatId: referrer.chatId,
                        reward: REWARD,
                    };
                }
            }

            const newReferralCode = `REF-${generateUniqueCode()}`;

            user = await prisma.user.create({
                data: {
                    chatId: String(chatId),
                    messengerType: messenger,
                    fullName,
                    username,
                    referralCode: newReferralCode,
                    balance: 0,
                    invitedById: invitedById ?? null,
                },
            });
        } else {

            const updates: Record<string, string | undefined> = {};
            if (user.fullName !== fullName) updates.fullName = fullName;
            if (user.username !== username) updates.username = username;

            if (Object.keys(updates).length > 0) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: updates,
                });
            }
        }

        return { user, rewardOptions };
    }
}