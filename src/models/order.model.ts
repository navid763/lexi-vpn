import { sequelize } from "../config/seqelize.ts";
import { DataTypes, Model, type Optional } from "sequelize";

export interface OrderAttributes {
    id: number;
    user_id: number;
    product_id: number;
    price: number;

    status:
    | "pending_payment"
    | "waiting_approval"
    | "approved"
    | "rejected"
    | "cancelled";

    receipt_image?: string;
    admin_note?: string;

    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

type OrderCreationAttributes = Optional<
    OrderAttributes,
    | "id"
    | "status"
    | "receipt_image"
    | "admin_note"
    | "created_at"
    | "updated_at"
    | "deleted_at"
>;

export class Order
    extends Model<OrderAttributes, OrderCreationAttributes>
    implements OrderAttributes {


    declare id: number;
    declare user_id: number;
    declare product_id: number;
    declare price: number;

    declare status:
        | "pending_payment"
        | "waiting_approval"
        | "approved"
        | "rejected"
        | "cancelled";

    declare receipt_image: string;
    declare admin_note: string;

    declare readonly created_at: Date;
    declare readonly updated_at: Date;
    declare readonly deleted_at: Date;
}

Order.init(
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

        product_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },

        price: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        status: {
            type: DataTypes.ENUM(
                "pending_payment",
                "waiting_approval",
                "approved",
                "rejected",
                "cancelled"
            ),
            defaultValue: "pending_payment",
        },

        receipt_image: {
            type: DataTypes.STRING,
        },

        admin_note: {
            type: DataTypes.TEXT,
        },

        created_at: DataTypes.DATE,
        updated_at: DataTypes.DATE,
        deleted_at: DataTypes.DATE,
    },
    {
        sequelize,
        tableName: "orders",
        timestamps: true,
        paranoid: true,
        underscored: true,
    }
);
