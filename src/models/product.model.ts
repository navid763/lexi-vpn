import { sequelize } from "../config/seqelize.ts";
import { DataTypes, Model, type Optional } from "sequelize";

interface ProductAttributes {
    id: number;
    name: string;
    price: number; //Rial
    traffic_limit: number; // MB
    duration_days: number;
    is_active: boolean;

    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

type ProductCreationAttributes = Optional<
    ProductAttributes,
    "id" | "is_active" | "created_at" | "updated_at" | "deleted_at"
>;

export class Product
    extends Model<ProductAttributes, ProductCreationAttributes>
    implements ProductAttributes {

    public id!: number;
    public name!: string;
    public price!: number;
    public traffic_limit!: number;
    public duration_days!: number;
    public is_active!: boolean;

    public readonly created_at!: Date;
    public readonly updated_at!: Date;
    public readonly deleted_at!: Date;
}

Product.init(
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

        price: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        traffic_limit: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        duration_days: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },

        created_at: DataTypes.DATE,
        updated_at: DataTypes.DATE,
        deleted_at: DataTypes.DATE,
    },
    {
        sequelize,
        tableName: "products",
        timestamps: true,
        paranoid: true,
        underscored: true,
    }
);
