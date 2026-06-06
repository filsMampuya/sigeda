import type { Request, Response } from "express";

import { organizationService } from "../services/registry";

export const serviceController = {
  async list(_request: Request, response: Response) {
    response.json(await organizationService.listByType("Service"));
  },
  async create(request: Request, response: Response) {
    response.status(201).json(await organizationService.createService(request.body));
  }
};
