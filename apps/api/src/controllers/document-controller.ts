import type { Request, Response } from "express";

import { documentService } from "../services/registry";

function getParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export const documentController = {
  async list(request: Request, response: Response) {
    response.json(await documentService.listForUser(request.user));
  },
  async getById(request: Request, response: Response) {
    response.json(await documentService.getByIdForUser(getParam(request.params.id), request.user));
  },
  async create(request: Request, response: Response) {
    response.status(201).json(await documentService.create(request.body, request.user));
  },
  async upload(request: Request, response: Response) {
    if (!request.file) {
      response.status(400).json({ message: "File is required." });
      return;
    }

    response.json(await documentService.uploadSourceFile(getParam(request.params.id), request.file));
  },
  async update(request: Request, response: Response) {
    response.json(await documentService.update(getParam(request.params.id), request.body));
  },
  async remove(_request: Request, response: Response) {
    response.status(501).json({ message: "Delete workflow not implemented yet." });
  },
  async archive(request: Request, response: Response) {
    response.json(await documentService.archive(getParam(request.params.id)));
  },
  async validate(request: Request, response: Response) {
    response.json(await documentService.validate(getParam(request.params.id)));
  },
  async reject(request: Request, response: Response) {
    response.json(await documentService.reject(getParam(request.params.id)));
  },
  async search(request: Request, response: Response) {
    response.json(await documentService.search(request.query, request.user));
  }
};
