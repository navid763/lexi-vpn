import app from "./app.js";
import { prisma } from "./config/prisma.js";
import { startBot } from "./bot/startBot.js";
import "./utils/cron/subscription-expire-check.js";
import "./utils/cron/order-timeout-check.js";
import { XuiService } from "./services/xui.service.js";

const PORT = process.env.PORT || 3000;

const start = async () => {
    try {
        // Verify the database connection is alive before accepting traffic.
        await prisma.$connect();
        console.log("✅ Database connected");

        await XuiService.warmup(); //for caching inbound

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        startBot();
    } catch (error) {
        console.error("Startup error:", error);
        // Cleanly close the Prisma connection pool before exiting.
        await prisma.$disconnect();
        process.exit(1);
    }
};

start();
