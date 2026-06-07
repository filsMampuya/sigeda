import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { HttpError } from "../errors/http-error";

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

  if (error instanceof HttpError) {
    return response.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error(error);

  return response.status(500).json({
    message: "Internal server error"
  });
}
