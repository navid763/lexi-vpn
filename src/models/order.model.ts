import { sequelize } from "../config/seqelize.ts";
import { DataTypes, Model, type Optional } from "sequelize";

interface OrderAttributes {
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


    public id!: number;
    public user_id!: number;
    public product_id!: number;
    public price!: number;

    public status!:
        | "pending_payment"
        | "waiting_approval"
        | "approved"
        | "rejected"
        | "cancelled";

    public receipt_image?: string;
    public admin_note?: string;

    public readonly created_at!: Date;
    public readonly updated_at!: Date;
    public readonly deleted_at!: Date;
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
