import type { Request, Response } from "express";

import { organizationService } from "../services/registry";

export const directionController = {
  async list(_request: Request, response: Response) {
    response.json(await organizationService.listByTypes(["DirectionGenerale", "Direction"]));
  },
  async create(request: Request, response: Response) {
    response.status(201).json(await organizationService.createDirection(request.body));
  }
};
