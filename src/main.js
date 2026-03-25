import app from "./app.ts"
import { initModels, sequelize } from "./models/index.ts";
import { startBot } from "./bot/startBot.ts";

const PORT = process.env.PORT || 3000;
const start = async () => {
    try {
        await sequelize.authenticate();
        console.log("Database connected");

        await initModels();


        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        startBot();


    } catch (error) {
        console.error("some error eccured:", error);
        process.exit(1);
    }
}

start();