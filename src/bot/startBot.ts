// import { BalePollingAdapter } from "./adapters/balePolling.adapter.ts";
// import { BaleAdapter } from "./adapters/bale.adapter.ts";
// import { parseBaleUpdate } from "./utils/parseBaleUpdate.ts";

// import { commandRouter } from "./routers/command.router.ts";
// import { callbackRouter } from "./routers/callback.router.ts";
// import { messageRouter } from "./routers/message.router.ts";

import axios from "axios";

export const startBot = async () => {

    // const token = process.env.BALE_BOT_TOKEN!;
    const token = process.env.TELEGRAM_BOT_TOKEN!;
    const webhookUrl = process.env.WEBHOOK_URL!;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET!;

    if (!token || !webhookUrl || !secret) {
        throw new Error("TELEGRAM_BOT_TOKEN, WEBHOOK_URL, and TELEGRAM_WEBHOOK_SECRET must all be set in .env");
    }


    try {
        const response = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`,
            {
                url: webhookUrl,
                secret_token: secret,
                // Tell Telegram which update types we care about (saves bandwidth)
                allowed_updates: ["message", "callback_query"]
            }
        );

        if (response.data.ok) {
            console.log(`✅ Telegram webhook registered: ${webhookUrl}`);
        } else {
            console.error("❌ Failed to register webhook:", response.data);
        }
    } catch (err) {
        console.error("❌ Error registering Telegram webhook:", err);
        throw err;
    }

    // const polling = new BalePollingAdapter(token);
    // const adapter = new BaleAdapter(token);
    // console.log("Bale polling started...");
    // polling.start(async (update) => {
    //     const ctx = parseBaleUpdate(update);
    //     if (!ctx) return;
    //     if (ctx.text?.startsWith("/")) {
    //         return commandRouter(ctx, adapter);
    //     }
    //     if (ctx.callbackData) {
    //         return callbackRouter(ctx, adapter);
    //     }
    //     return messageRouter(ctx, adapter);
    // });
};
