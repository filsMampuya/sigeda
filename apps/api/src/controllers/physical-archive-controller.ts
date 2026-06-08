import type { Request, Response } from "express";

import { physicalArchiveQueryService, physicalArchiveService } from "../services/registry";

export const physicalArchiveController = {
  async list(request: Request, response: Response) {
    response.json(await physicalArchiveQueryService.listForUser(request.query, request.user));
  },
  async create(request: Request, response: Response) {
    response.status(201).json(await physicalArchiveService.create(request.body, request.user));
  }
};
