import type { Request, Response } from "express";

import { dashboardService } from "../services/registry";

export const dashboardController = {
  async stats(_request: Request, response: Response) {
    response.json(await dashboardService.getStats());
  }
};
