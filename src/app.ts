import express from "express";
import rateLimit from "express-rate-limit";

import adminRouther from "./routes/admin.router.ts";
import orderRouther from "./routes/order.router.ts";
import paymentRouther from "./routes/payment.router.ts";
import { telegramWebhook } from "./bot/telegram.webhooks.ts";

const app = express();

app.use(express.json());
app.use("/admin", adminRouther);
app.use("/order", orderRouther);
app.use("/payment", paymentRouther);

app.get("/", (req, res) => {
    res.send("Lexi-Bot API Running");
});

// Telegram sends at most one webhook call per update, but this guards against
// someone hammering the endpoint directly (e.g. DDoS or fuzzing).
// 300 requests / 1 minute per IP is generous for legitimate Telegram traffic.
const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests",
});

app.post("/telegram/webhook", webhookLimiter, telegramWebhook);

app.get('/', (req, res) => {
    res.send('OK');
});

export default app;