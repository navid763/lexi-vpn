import { prisma } from "../config/prisma.ts";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";

export class ConfigService {
    static async createConfig(
        subscriptionId: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;

        const uuid = crypto.randomUUID();
        // In production you'd build this URL from env vars pointing at your
        // actual VPN server rather than the placeholder below.
        const configUrl = `vless://${uuid}@example.com:443?type=tcp#Lexi`;

        const config = await db.config.create({
            data: {
                subscriptionId,
                uuid,
                configUrl,
            },
        });

        return config;
    }
}