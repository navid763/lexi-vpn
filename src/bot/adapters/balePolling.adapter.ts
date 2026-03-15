import axios from "axios";

export class BalePollingAdapter {
    private token: string;
    private offset = 0;

    constructor(token: string) {
        this.token = token;
    }

    async start(handler: (update: any) => Promise<void>) {
        console.log("Bale polling started...");

        while (true) {
            try {
                const res = await axios.post(
                    `https://tapi.bale.ai/bot${this.token}/getUpdates`,
                    {
                        offset: this.offset,
                        timeout: 30
                    }
                );

                const updates = res.data.result;

                for (const update of updates) {
                    this.offset = update.update_id + 1;

                    await handler(update);
                }
            } catch (err) {
                console.error("Polling error:", err);
            }

            await new Promise((r) => setTimeout(r, 2000));
        }
    }
}
