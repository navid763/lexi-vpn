import { sequelize } from "../config/seqelize.ts";
import { DataTypes, Model } from "sequelize";
import type { Optional } from "sequelize";

interface UserAttributes {
    id: number;
    chat_id: string;
    messenger_type: "telegram" | "bale";
    username?: string;
    full_name?: string;
    is_admin?: boolean;
    created_at?: Date;
    updated_at?: Date;
};

type UserCreationAttributes = Optional<UserAttributes, "id" | "created_at" | "updated_at" | "is_admin">;

export class User extends Model<UserAttributes, UserCreationAttributes>
    implements UserAttributes {

    public id!: number;
    public chat_id!: string;
    public messenger_type!: "telegram" | "bale";
    public username?: string;
    public full_name?: string;
    public is_admin?: boolean;

    public readonly created_at!: Date;
    public readonly updated_at!: Date;

};

User.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        chat_id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        username: {
            type: DataTypes.STRING,
        },
        full_name: {
            type: DataTypes.STRING,
        },
        is_admin: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        messenger_type: {
            type: DataTypes.STRING,
            defaultValue: "bale",
        },
        created_at: DataTypes.DATE,
        updated_at: DataTypes.DATE,
    },
    {
        sequelize,
        tableName: "users",
        underscored: true,
        timestamps: true,
        paranoid: true,
    }
)