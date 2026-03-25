import { sequelize } from "../config/seqelize.ts";

import { User } from "./user.model.ts";
import { Product } from "./product.model.ts";
import { Order } from "./order.model.ts";
import { Payment } from "./payment.model.ts";
import { Server } from "./server.model.ts";
import { Subscription } from "./subscription.model.ts";
import { Config } from "./config.model.ts";


export const initModels = async () => {
    //associations
    User.hasMany(Order, {
        foreignKey: "user_id",
        as: "orders",
    });
    Order.belongsTo(User, {
        foreignKey: "user_id",
        as: "user",
    });


    Product.hasMany(Order, {
        foreignKey: "product_id",
        as: "orders",
    });
    Order.belongsTo(Product, {
        foreignKey: "product_id",
        as: "product",
    });


    Order.hasOne(Payment, {
        foreignKey: "order_id",
        as: "payment",
    });
    Payment.belongsTo(Order, {
        foreignKey: "order_id",
        as: "order",
    });


    User.hasMany(Subscription, {
        foreignKey: "user_id",
        as: "subscriptions",
    });
    Subscription.belongsTo(User, {
        foreignKey: "user_id",
        as: "user",
    });


    Order.hasOne(Subscription, {
        foreignKey: "order_id",
        as: "subscription",
    });
    Subscription.belongsTo(Order, {
        foreignKey: "order_id",
        as: "order",
    });


    Server.hasMany(Subscription, {
        foreignKey: "server_id",
        as: "subscriptions",
    });
    Subscription.belongsTo(Server, {
        foreignKey: "server_id",
        as: "server",
    });


    Subscription.hasOne(Config, {
        foreignKey: "subscription_id",
        as: "config",
    });
    Config.belongsTo(Subscription, {
        foreignKey: "subscription_id",
        as: "subscription",
    });


    await sequelize.sync();
    console.log("✅ All models synced with Database");
};

export {
    sequelize,
    User,
    Product,
    Order,
    Payment,
    Server,
    Subscription,
    Config
};