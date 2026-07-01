import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../shared/current-user.decorator.js";
import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { AnalyzeDocumentDto } from "./dto/analyze-document.dto.js";
import { DocumentIntelligenceService } from "./document-intelligence.service.js";

const allowedDocumentIntelligenceMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png"
]);
const maxUploadBytes = Number.parseInt(process.env.MAX_DOCUMENT_UPLOAD_BYTES ?? `${25 * 1024 * 1024}`, 10);

@UseGuards(AuthGuard, RolesGuard)
@Controller("document-intelligence")
export class DocumentIntelligenceController {
  constructor(private readonly intelligence: DocumentIntelligenceService) {}

  @Post("analyze")
  @HttpCode(202)
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: maxUploadBytes
      },
      fileFilter: (_request, file, callback) => {
        if (!allowedDocumentIntelligenceMimeTypes.has(file.mimetype)) {
          callback(new BadRequestException("Type de fichier non autorise pour l'analyse."), false);
          return;
        }

        callback(null, true);
      }
    })
  )
  analyze(
    @Body() body: AnalyzeDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() principal: AuthenticatedPrincipal
  ) {
    return this.intelligence.analyze(
      {
        mode: body.mode,
        file
      },
      principal
    );
  }

  @Get("readiness")
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT")
  getReadiness() {
    return this.intelligence.getReadiness();
  }

  @Get("jobs/:id")
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT")
  getJob(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() principal: AuthenticatedPrincipal
  ) {
    return this.intelligence.getJob(id, principal);
  }

  @Get("results/:id")
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT")
  getResult(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() principal: AuthenticatedPrincipal
  ) {
    return this.intelligence.getResult(id, principal);
  }
}
