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

        // trafficLimit is stored as "GB × 1000" (e.g. 10 GB → 10000).
        // Convert back to GB, then to bytes using 1024^3 (binary GiB) —
        // the base 3x-ui/V2Ray clients use when displaying "GB" — so the
        // quota shown to the user in the VPN client matches what the
        // admin entered and what the bot displays
        const trafficLimitBytes = Math.round((subscription.trafficLimit / 1000) * 1024 ** 3);
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
