import type { Request, Response } from "express";

import { bureauService } from "../services/registry";

export const bureauController = {
  async list(_request: Request, response: Response) {
    response.json(await bureauService.list());
  },
  async create(request: Request, response: Response) {
    response.status(201).json(await bureauService.create(request.body));
  }
};
