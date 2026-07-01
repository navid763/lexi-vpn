import { prisma } from "../config/prisma.js";
import { XuiService } from "./xui.service.js";

const TEST_TRAFFIC_BYTES = 100 * 1024 * 1024;      // 100 MB
const TEST_DURATION_MS = 5 * 60 * 60 * 1000;        // 5 hours
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;       // 30 days

export class TestTrialService {
    static async getEligibility(userId: number) {
        const lastTrial = await prisma.testTrial.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        if (!lastTrial) return { eligible: true as const };

        const nextEligibleAt = new Date(lastTrial.createdAt.getTime() + COOLDOWN_MS);
        if (nextEligibleAt <= new Date()) return { eligible: true as const };

        return { eligible: false as const, nextEligibleAt };
    }

    static async createTrial(userId: number) {
        const remark = `test-${userId}-${Date.now()}`;
        const expiryTimeMs = Date.now() + TEST_DURATION_MS;

        // Provision on the panel first — if it fails, we never touch the DB,
        // so a user can't burn their monthly trial on a failed request.
        const xuiResult = await XuiService.addClient(TEST_TRAFFIC_BYTES, expiryTimeMs, remark, "trial");

        return prisma.testTrial.create({
            data: {
                userId,
                uuid: xuiResult.uuid,
                configUrl: xuiResult.configUrl,
                subUrl: xuiResult.subUrl,
                clientEmail: xuiResult.email,
                expireAt: new Date(expiryTimeMs),
            },
        });
    }
}