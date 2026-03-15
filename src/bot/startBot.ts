import { BalePollingAdapter } from "./adapters/balePolling.adapter.ts";
import { BaleAdapter } from "./adapters/bale.adapter.ts";
import { parseBaleUpdate } from "./utils/parseBaleUpdate.ts";

import { startHandler } from "./handlers/start.handler.ts";
import { plansHandler } from "./handlers/plans.handler.ts";

export const startBot = async () => {

    const token = process.env.BALE_BOT_TOKEN!;

    const polling = new BalePollingAdapter(token);
    const adapter = new BaleAdapter(token);

    console.log("Bale polling started...");

    polling.start(async (update) => {

        const ctx = parseBaleUpdate(update);

        if (!ctx) return;

        if (ctx.text === "/start") {
            await startHandler(ctx, adapter);
            console.log("started the bot");

        }
        if (ctx.callbackData === "HOME") {
            await startHandler(ctx, adapter);
        }

        if (ctx.callbackData === "PLANS") {
            await plansHandler(ctx, adapter);
        }

    });
};
