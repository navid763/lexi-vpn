import { prisma } from "../config/prisma.js";

interface CardInfo {
    cardNumber: string;
    cardOwner: string;
}

let cachedCardInfo: CardInfo | null = null;
let cachedMaintenanceMode: boolean | null = null;
let cachedReferralReward: number | null = null;


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
        if (key === "REFERRAL_REWARD") {
            cachedReferralReward = null;
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


    // inside SettingsService class:
    static async isMaintenanceMode(): Promise<boolean> {
        if (cachedMaintenanceMode !== null) return cachedMaintenanceMode;
        const value = await this.get("MAINTENANCE_MODE");
        cachedMaintenanceMode = value === "true";
        return cachedMaintenanceMode;
    }

    static async getReferralReward(): Promise<number> {
        if (cachedReferralReward !== null) return cachedReferralReward;
        const value = await this.get("REFERRAL_REWARD");
        cachedReferralReward = value ? parseInt(value) : 0;
        return cachedReferralReward;
    }

    static async setReferralReward(amountRial: number): Promise<void> {
        await this.set("REFERRAL_REWARD", String(amountRial));
        cachedReferralReward = amountRial;
    }

    static async setMaintenanceMode(enabled: boolean): Promise<void> {
        await this.set("MAINTENANCE_MODE", enabled ? "true" : "false");
        cachedMaintenanceMode = enabled;
    }

}