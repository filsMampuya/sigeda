import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError) {
    return response.status(400).json({
      message: "Validation error",
      issues: error.issues
    });
  }

  console.error(error);

  return response.status(500).json({
    message: "Internal server error"
  });
}
