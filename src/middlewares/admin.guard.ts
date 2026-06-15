import type { Request, Response, NextFunction } from "express";

export const adminGuard = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !user.is_admin) {
        return res.status(403).json({
            error: "Admin access required"
        });
    }

    next();
}
