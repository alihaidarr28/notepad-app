/** @format */

import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
	if (req.session.userId === undefined) {
		return res.status(401).json({
			message: "You must be logged in",
		});
	}

	next();
}
