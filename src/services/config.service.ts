import { prisma } from "../config/prisma.js";
import { XuiService } from "./xui.service.js";
import type { Prisma } from "@prisma/client";

export class ConfigService {
    /**
     * Creates a client on the 3x-ui panel and persists the result in the DB.
     *
     * @param subscriptionId  DB id of the Subscription record
     * @param tx              Optional Prisma transaction client
     */
    static async createConfig(
        subscriptionId: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;

        // Fetch the subscription so we know traffic limit and expiry
        const subscription = await db.subscription.findUniqueOrThrow({
            where: { id: subscriptionId },
            include: {
                user: true,
                order: { include: { product: true } },
            },
        });

        // ── Build parameters for the panel ───────────────────────────────────

        // trafficLimit is stored in MB in the DB (e.g. 10000 = 10 GB).
        // 3x-ui addClient expects bytes.
        // FIX: was incorrectly multiplying by 1024^3 (treating MB as GB → ~1000x too large).
        const trafficLimitBytes = subscription.trafficLimit * 1024 * 1024; // MB → bytes

        const expiryTimeMs = new Date(subscription.expireAt).getTime();

        // Friendly label visible in the panel UI
        const remark = `user-${subscription.userId}-sub-${subscriptionId}`;

        // ── Call the panel ────────────────────────────────────────────────────
        const xuiResult = await XuiService.addClient(trafficLimitBytes, expiryTimeMs, remark);

        // ── Persist ───────────────────────────────────────────────────────────
        // subUrl already exists as a nullable column in the schema — store it directly.
        const config = await db.config.create({
            data: {
                subscriptionId,
                uuid: xuiResult.uuid,
                configUrl: xuiResult.configUrl,
                subUrl: xuiResult.subUrl,
            },
        });

        return config;
    }
}
