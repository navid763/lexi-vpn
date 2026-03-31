import { sequelize } from "../config/seqelize.ts";
import { DataTypes, Model } from "sequelize";
import type { Optional, CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes } from "sequelize"
import { User } from "./user.model.ts";
import { Order } from "./order.model.ts";

interface PaymentAttributes {
    id: CreationOptional<number>;
    user_id: ForeignKey<User["id"]>;
    order_id: ForeignKey<Order["id"]> | null;

    amount: number;
    type: "order_payment" | "wallet_topup";
    receipt_image?: string;
    destination_card?: string;
    status: "pending" | "approved" | "rejected" | "cancelled";

    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

interface PaymentCreationAttributes
    extends InferCreationAttributes<Payment, { omit: "id" }> { }

export class Payment
    extends Model<
        InferAttributes<Payment>,
        PaymentCreationAttributes
    > {
    declare id: CreationOptional<number>;
    declare user_id: ForeignKey<User["id"]>;
    declare order_id: ForeignKey<Order["id"]> | null;

    declare amount: number;

    declare type: CreationOptional<"order_payment" | "wallet_topup">;

    declare receipt_image: CreationOptional<string | null>;
    declare destination_card: CreationOptional<string | null>;

    declare status: CreationOptional<"pending" | "approved" | "rejected" | "cancelled">;

    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
    declare readonly deleted_at: CreationOptional<Date> | null;
}

Payment.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },

        order_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        type: {
            type: DataTypes.ENUM("order_payment", "wallet_topup"),
            allowNull: false,
            defaultValue: "order_payment",
        },
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        destination_card: {
            type: DataTypes.STRING,
            allowNull: true
        },

        receipt_image: {
            type: DataTypes.STRING,
            allowNull: true
        },

        status: {
            type: DataTypes.ENUM("pending", "approved", "rejected", "cancelled"),
            defaultValue: "pending",
        },

        created_at: DataTypes.DATE,
        updated_at: DataTypes.DATE,
        deleted_at: DataTypes.DATE
    },
    {
        sequelize,
        tableName: "payments",
        timestamps: true,
        underscored: true,
        paranoid: true
    }
);
