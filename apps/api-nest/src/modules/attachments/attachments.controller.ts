import { Controller, Get, UseGuards } from "@nestjs/common";
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
}
