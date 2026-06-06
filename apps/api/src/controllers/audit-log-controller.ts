import type { Request, Response } from "express";

import { auditLogService } from "../services/registry";

export const auditLogController = {
  async list(_request: Request, response: Response) {
    response.json(await auditLogService.list());
  }
};
