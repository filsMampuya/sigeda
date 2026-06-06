import type { Request, Response } from "express";

import { organizationService } from "../services/registry";

export const bureauController = {
  async list(_request: Request, response: Response) {
    response.json(await organizationService.listByType("Bureau"));
  },
  async create(request: Request, response: Response) {
    response.status(201).json(await organizationService.createBureau(request.body));
  }
};
