import { BalePollingAdapter } from "./adapters/balePolling.adapter.ts";
import { BaleAdapter } from "./adapters/bale.adapter.ts";
import { parseBaleUpdate } from "./utils/parseBaleUpdate.ts";

import { commandRouter } from "./routers/command.router.ts";
import { callbackRouter } from "./routers/callback.router.ts";
import { messageRouter } from "./routers/message.router.ts";

export const startBot = async () => {

    const token = process.env.BALE_BOT_TOKEN!;

    const polling = new BalePollingAdapter(token);
    const adapter = new BaleAdapter(token);

    console.log("Bale polling started...");

    polling.start(async (update) => {

        const ctx = parseBaleUpdate(update);

        if (!ctx) return;

        if (ctx.text?.startsWith("/")) {
            return commandRouter(ctx, adapter);
        }

        if (ctx.callbackData) {
            return callbackRouter(ctx, adapter);
        }

        return messageRouter(ctx, adapter);
    });
};
