import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../..", ".env") });

export const sequelize = new Sequelize(
    process.env.DB_NAME as string,
    process.env.DB_USER as string,
    process.env.DB_PASSWORD as string,
    {
        host: process.env.DB_HOST as string,
        dialect: "mysql",
        timezone: "+03:30",

        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },

        retry: {
            max: 3
        },

        // logging: (sql) => {
        //     console.log("SQL: ", sql);
        // },

        define: {
            underscored: true
        }
    }

);
