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
    balance: number;
    referral_code: string;
    invited_by?: number | null;

    created_at?: Date;
    updated_at?: Date;
};

type UserCreationAttributes = Optional<UserAttributes, "id" | "created_at" | "updated_at" | "is_admin" | "balance">;

export class User extends Model<UserAttributes, UserCreationAttributes>
    implements UserAttributes {

    public id!: number;
    public chat_id!: string;
    public messenger_type!: "telegram" | "bale";
    public username?: string;
    public full_name?: string;
    public is_admin?: boolean;
    public balance!: number;
    public referral_code!: string;
    public invited_by?: number | null;

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
        balance: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        },
        referral_code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        invited_by: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
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