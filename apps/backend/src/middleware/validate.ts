import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { AppError } from "../errors/AppError";

export function validateBody(schema: AnyZodObject) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        }));
        next(new AppError("Validation failed", 400, issues));
        return;
      }
      next(error);
    }
  };
}

export function validateQuery(schema: AnyZodObject) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req.query);
      Object.defineProperty(req, "query", {
        value: parsed,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        }));
        next(new AppError("Invalid query parameters", 400, issues));
        return;
      }
      next(error);
    }
  };
}
