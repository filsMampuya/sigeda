import type { Request, Response } from "express";

export const authController = {
  me(request: Request, response: Response) {
    response.json({
      user: request.user ?? null
    });
  }
};
