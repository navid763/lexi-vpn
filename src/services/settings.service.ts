import { prisma } from "../config/prisma.js";

interface CardInfo {
    cardNumber: string;
    cardOwner: string;
}

let cachedCardInfo: CardInfo | null = null;

export class SettingsService {
    static async get(key: string): Promise<string | null> {
        const row = await prisma.setting.findUnique({ where: { key } });
        return row?.value ?? null;
    }

    static async set(key: string, value: string): Promise<void> {
        await prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });

        if (key === "CARD_NUMBER" || key === "CARD_OWNER") {
            cachedCardInfo = null; // invalidate cache on change
        }
    }

    static async getCardInfo(): Promise<CardInfo> {
        if (cachedCardInfo) return cachedCardInfo;

        const [cardNumber, cardOwner] = await Promise.all([
            this.get("CARD_NUMBER"),
            this.get("CARD_OWNER"),
        ]);

        cachedCardInfo = {
            cardNumber: cardNumber ?? "—",
            cardOwner: cardOwner ?? "—",
        };

        return cachedCardInfo;
    }
}