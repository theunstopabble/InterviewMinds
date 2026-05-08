import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export interface CorrelatedRequest extends Request {
  correlationId: string;
}

export const correlationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const id = req.headers["x-correlation-id"] || uuidv4();
  (req as CorrelatedRequest).correlationId = String(id);
  res.setHeader("x-correlation-id", String(id));
  next();
};
