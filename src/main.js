import app from "./app.ts";
import { prisma } from "./config/prisma.ts";
import { startBot } from "./bot/startBot.ts";
import "./utils/cron/subscription-expire-check.ts";

const PORT = process.env.PORT || 3000;

const start = async () => {
    try {
        // Verify the database connection is alive before accepting traffic.
        await prisma.$connect();
        console.log("✅ Database connected");


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