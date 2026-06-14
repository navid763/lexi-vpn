import { prisma } from "../config/prisma.ts";
import { XuiService } from "./xui.service.ts";
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

        // stored as MB (10000 = 10 GB) in DB
        // 3x-ui expects bytes
        const trafficLimitBytes = subscription.trafficLimit * 1024 * 1024 * 1024; // GB to Bytes

        const expiryTimeMs = new Date(subscription.expireAt).getTime();

        // Friendly label visible in the panel UI
        const remark = `user-${subscription.userId}-sub-${subscriptionId}`;

        // ── Call the panel ────────────────────────────────────────────────────
        const xuiResult = await XuiService.addClient(trafficLimitBytes, expiryTimeMs, remark);

        // ── Persist ───────────────────────────────────────────────────────────
        const config = await db.config.create({
            data: {
                subscriptionId,
                uuid: xuiResult.uuid,
                // Store the direct import URI as configUrl (what we show the user)
                configUrl: xuiResult.configUrl,
                // Store the subscription link in a separate column so the bot can
                // send both. We reuse the existing schema — see note below.
                // If you want to add a `subUrl` column, run a migration and add it
                // to the Prisma model. For now we embed it after a newline so the
                // bot can split on "\n" to retrieve it.
                // Better: add the column. For a zero-migration approach uncomment:
                // configUrl: `${xuiResult.configUrl}\n${xuiResult.subUrl}`,
            },
        });

        // Return extra fields the bot needs even though they aren't in the DB model
        return {
            ...config,
            subUrl: xuiResult.subUrl,
        };
    }
}
