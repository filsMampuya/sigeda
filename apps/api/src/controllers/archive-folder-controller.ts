import type { Request, Response } from "express";

import { archiveFolderQueryService, archiveFolderService } from "../services/registry";

function getParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export const archiveFolderController = {
  async list(request: Request, response: Response) {
    response.json(await archiveFolderQueryService.listForUser(request.query, request.user));
  },
  async create(request: Request, response: Response) {
    response.status(201).json(await archiveFolderService.createManualFolder(request.body, request.user));
  },
  async updateStatus(request: Request, response: Response) {
    response.json(await archiveFolderService.updateStatus(getParam(request.params.id), request.body.status, request.user));
  }
};
