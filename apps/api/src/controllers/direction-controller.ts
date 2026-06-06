import type { Request, Response } from "express";

import { directionService } from "../services/registry";

export const directionController = {
  async list(_request: Request, response: Response) {
    response.json(await directionService.list());
  },
  async create(request: Request, response: Response) {
    response.status(201).json(await directionService.create(request.body));
  }
};
