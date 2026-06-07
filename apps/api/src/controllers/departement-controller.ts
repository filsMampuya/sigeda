import type { Request, Response } from "express";

import { departementService } from "../services/registry";

export const departementController = {
  async list(_request: Request, response: Response) {
    response.json(await departementService.list());
  },
  async hierarchy(_request: Request, response: Response) {
    response.json(await departementService.hierarchy());
  },
  async getByCode(request: Request, response: Response) {
    response.json(await departementService.getByCode(String(request.params.code)));
  },
  async create(request: Request, response: Response) {
    response.status(201).json(await departementService.create(request.body));
  }
};
