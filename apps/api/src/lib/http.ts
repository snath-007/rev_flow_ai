import type { RequestHandler } from "express";
import { ZodError, type ZodSchema } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function validateBody<T>(schema: ZodSchema<T>): RequestHandler<unknown, unknown, T> {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(new ApiError(400, "VALIDATION_ERROR", "Invalid request body", result.error.flatten()));
      return;
    }

    req.body = result.data;
    next();
  };
}

export function toApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ApiError(400, "VALIDATION_ERROR", "Invalid request", error.flatten());
  }

  return new ApiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
}
