import type { Request, Response } from "express";

import { userService } from "../services/registry";

export const userController = {
  async list(_request: Request, response: Response) {
    response.json(await userService.list());
  },
  async getByMatricule(request: Request, response: Response) {
    response.json(await userService.getByMatricule(String(request.params.matricule)));
  },
  async create(request: Request, response: Response) {
    response.status(201).json(await userService.create(request.body));
  }
};
