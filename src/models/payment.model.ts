import { sequelize } from "../config/seqelize.ts";
import { DataTypes, Model, type Optional } from "sequelize";

interface PaymentAttributes {
    id: number;
    order_id: number;

    amount: number;
    destination_card?: string;
    receipt_image?: string;

    status: "pending" | "approved" | "rejected";

    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

type PaymentCreationAttributes = Optional<
    PaymentAttributes,
    "id" | "destination_card" | "receipt_image" | "status" | "created_at" | "updated_at" | "deleted_at"
>;

export class Payment
    extends Model<PaymentAttributes, PaymentCreationAttributes>
    implements PaymentAttributes {
    public id!: number;
    public order_id!: number;

    public amount!: number;
    public destination_card?: string;
    public receipt_image?: string;

    public status!: "pending" | "approved" | "rejected";

    public readonly created_at!: Date;
    public readonly updated_at!: Date;
    public readonly deleted_at!: Date;
}

Payment.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },

        order_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },

        amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        destination_card: {
            type: DataTypes.STRING,
        },

        receipt_image: {
            type: DataTypes.STRING,
        },

        status: {
            type: DataTypes.ENUM("pending", "approved", "rejected"),
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
