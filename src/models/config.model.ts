import { sequelize } from "../config/seqelize.ts";
import { DataTypes, Model, type Optional } from "sequelize";

interface ConfigAttributes {
    id: number;
    subscription_id: number;

    uuid: string;
    config_url: string;

    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

type ConfigCreationAttributes = Optional<
    ConfigAttributes,
    "id" | "created_at" | "updated_at" | "deleted_at"
>;

export class Config
    extends Model<ConfigAttributes, ConfigCreationAttributes>
    implements ConfigAttributes {
    public id!: number;
    public subscription_id!: number;

    public uuid!: string;
    public config_url!: string;

    public readonly created_at!: Date;
    public readonly updated_at!: Date;
    public readonly deleted_at!: Date;
}

Config.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },

        subscription_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },

        uuid: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        config_url: {
            type: DataTypes.TEXT,
            allowNull: false,
        },

        created_at: DataTypes.DATE,
        updated_at: DataTypes.DATE,
        deleted_at: DataTypes.DATE
    },
    {
        sequelize,
        tableName: "configs",
        timestamps: true,
        underscored: true,
        paranoid: true
    }
);
