import { Controller, Get, Param, ParseUUIDPipe, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { CurrentUser } from "../../shared/current-user.decorator.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { AttachmentsService } from "./attachments.service.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("attachments")
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get("storage-plan")
  storagePlan() {
    return this.attachments.storagePlan();
  }

  @Get(":id/access")
  access(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query("disposition") disposition: "view" | "download" | undefined,
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Req() request: Request
  ) {
    return this.attachments.getSecureAccessPayload(id, principal, request, disposition);
  }

  @Get(":id/download")
  async download(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Req() request: Request,
    @Res() response: Response
  ) {
    const payload = await this.attachments.getDownloadPayload(id, principal, request);

    response.setHeader("Content-Type", payload.mimeType);
    response.setHeader("Content-Disposition", `inline; filename="${payload.fileName}"`);
    payload.stream.pipe(response);
  }
}
