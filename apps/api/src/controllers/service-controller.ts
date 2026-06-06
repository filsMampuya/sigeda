import type { Request, Response } from "express";

import { serviceService } from "../services/registry";

export const serviceController = {
  async list(_request: Request, response: Response) {
    response.json(await serviceService.list());
  },
  async create(request: Request, response: Response) {
    response.status(201).json(await serviceService.create(request.body));
  }
};
