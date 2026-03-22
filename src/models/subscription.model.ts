import { sequelize } from "../config/seqelize.ts";
import { DataTypes, Model, type Optional } from "sequelize";

interface SubscriptionAttributes {
    id: number;
    user_id: number;
    order_id: number;
    server_id: number;

    traffic_limit: number;
    expire_at: Date;

    status: "active" | "expired" | "cancelled";

    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

type SubscriptionCreationAttributes = Optional<
    SubscriptionAttributes,
    "id" | "status" | "created_at" | "updated_at" | "deleted_at"
>;

export class Subscription
    extends Model<SubscriptionAttributes, SubscriptionCreationAttributes>
    implements SubscriptionAttributes {
    public id!: number;
    public user_id!: number;
    public order_id!: number;
    public server_id!: number;

    public traffic_limit!: number;
    public expire_at!: Date;

    public status!: "active" | "expired" | "cancelled";

    public readonly created_at!: Date;
    public readonly updated_at!: Date;
    public readonly deleted_at!: Date;
}

Subscription.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
        },

        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },

        order_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },

        server_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },

        traffic_limit: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        expire_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },

        status: {
            type: DataTypes.ENUM("active", "expired", "cancelled"),
            defaultValue: "active",
        },

        created_at: DataTypes.DATE,
        updated_at: DataTypes.DATE,
        deleted_at: DataTypes.DATE
    },
    {
        sequelize,
        tableName: "subscriptions",
        timestamps: true,
        underscored: true,
        paranoid: true
    }
);
