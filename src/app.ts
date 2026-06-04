import express from "express";

import adminRouther from "./routes/admin.router.ts";
import orderRouther from "./routes/order.router.ts";
import paymentRouther from "./routes/payment.router.ts";
// import { baleWebhook } from "./bot/bale.webhook.ts";
import { telegramWebhook } from "./bot/telegram.webhooks.ts";


const app = express();

app.use(express.json());
app.use("/admin", adminRouther);
app.use("/order", orderRouther);
app.use("/payment", paymentRouther);

app.get("/", (req, res) => {
    res.send("Lexi-Bot API Running");
});

app.post(`/telegram/webhook`, telegramWebhook);

export default app;