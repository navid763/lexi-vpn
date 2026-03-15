import { sequelize } from "../config/seqelize.ts";
import { DataTypes, Model, type Optional } from "sequelize";

interface ServerAttributes {
    id: number;
    name: string;
    host: string;
    panel_type: string;
    is_active: boolean;

    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

type ServerCreationAttributes = Optional<
    ServerAttributes,
    "id" | "is_active" | "created_at" | "updated_at" | "deleted_at"
>;

export class Server
    extends Model<ServerAttributes, ServerCreationAttributes>
    implements ServerAttributes {
    public id!: number;
    public name!: string;
    public host!: string;
    public panel_type!: string;
    public is_active!: boolean;

    public readonly created_at!: Date;
    public readonly updated_at!: Date;
    public readonly deleted_at!: Date;
}

Server.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        host: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        panel_type: {
            type: DataTypes.STRING,
        },

        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },

        created_at: DataTypes.DATE,
        updated_at: DataTypes.DATE,
        deleted_at: DataTypes.DATE
    },
    {
        sequelize,
        tableName: "servers",
        timestamps: true,
        underscored: true,
        paranoid: true
    }
);
