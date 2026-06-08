import type { Request, Response } from "express";

import { documentArchiveQueryService } from "../services/registry";

export const documentArchiveController = {
  async list(request: Request, response: Response) {
    response.json(await documentArchiveQueryService.listForUser(request.query, request.user));
  }
};
