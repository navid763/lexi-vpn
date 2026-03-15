import { Config } from "../models/index.ts";
import crypto from "crypto";
import type { Transaction } from "sequelize";

export class ConfigService {

    static async createConfig(subscriptionId: number, transaction?: Transaction) {

        const uuid = crypto.randomUUID();

        const configUrl = `vless://${uuid}@example.com:443?type=tcp#Lexi`;

        const config = await Config.create({
            subscription_id: subscriptionId,
            uuid,
            config_url: configUrl
        }, { transaction });

        return config;
    }

}
