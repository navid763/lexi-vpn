import { prisma } from "../config/prisma.js";
import * as crypto from "crypto";

function generateCode(): string {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export class AdLinkService {
    static async createLink(label: string) {
        const code = `AD-${generateCode()}`;
        return prisma.joinLink.create({ data: { code, label } });
    }

    static async getAllWithCounts() {
        const links = await prisma.joinLink.findMany({
            include: { _count: { select: { users: true } } },
            orderBy: { createdAt: "desc" },
        });

        return links.map((l) => ({
            id: l.id,
            code: l.code,
            label: l.label,
            joins: l._count.users,
            createdAt: l.createdAt,
        }));
    }

    static async getByCode(code: string) {
        return prisma.joinLink.findUnique({ where: { code } });
    }
}