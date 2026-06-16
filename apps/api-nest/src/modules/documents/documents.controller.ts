import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import type { Request } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../shared/current-user.decorator.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { CreateDocumentAnnotationDto } from "./dto/create-document-annotation.dto.js";
import { CreateDocumentDto } from "./dto/create-document.dto.js";
import { CreateDocumentVersionDto } from "./dto/create-document-version.dto.js";
import { DocumentsService } from "./documents.service.js";

const allowedDocumentMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword"
]);
const maxUploadBytes = Number.parseInt(process.env.MAX_DOCUMENT_UPLOAD_BYTES ?? `${25 * 1024 * 1024}`, 10);
const allowedAnnotationMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword"
]);

@UseGuards(AuthGuard, RolesGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list() {
    return this.documents.list();
  }

  @Get(":id")
  get(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() principal: AuthenticatedPrincipal) {
    return this.documents.get(id, principal);
  }

  @Get(":id/history")
  history(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.documents.getHistory(id);
  }

  @Post()
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: maxUploadBytes
      },
      fileFilter: (_request, file, callback) => {
        if (!allowedDocumentMimeTypes.has(file.mimetype)) {
          callback(new BadRequestException("Type de fichier non autorise."), false);
          return;
        }

        callback(null, true);
      }
    })
  )
  create(
    @Body() body: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() principal: AuthenticatedPrincipal
  ) {
    if (file) {
      return this.documents.createFromUpload(body as unknown as Record<string, unknown>, file, principal);
    }

    return this.documents.create(body, principal);
  }

  @Post(":id/annotations")
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: maxUploadBytes
      },
      fileFilter: (_request, file, callback) => {
        if (!allowedAnnotationMimeTypes.has(file.mimetype)) {
          callback(new BadRequestException("Type de fichier non autorise."), false);
          return;
        }

        callback(null, true);
      }
    })
  )
  createAnnotation(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: CreateDocumentAnnotationDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() principal: AuthenticatedPrincipal
  ) {
    return this.documents.createAnnotation(id, body, file, principal);
  }

  @Get(":documentId/annotations/:annotationId/access")
  accessAnnotationFile(
    @Param("documentId", new ParseUUIDPipe()) documentId: string,
    @Param("annotationId", new ParseUUIDPipe()) annotationId: string,
    @Query("disposition") disposition: "view" | "download" | undefined,
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Req() request: Request
  ) {
    return this.documents.getDocumentAnnotationAccessPayload(documentId, annotationId, principal, request, disposition);
  }

  @Post(":id/classify")
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT")
  classify(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() principal: AuthenticatedPrincipal
  ) {
    return this.documents.classify(id, principal);
  }

  @Post(":id/versions")
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT")
  createVersion(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: CreateDocumentVersionDto,
    @CurrentUser() principal: AuthenticatedPrincipal
  ) {
    return this.documents.createVersion(id, body, principal);
  }

  @Post(":id/finalize")
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT")
  finalize(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() principal: AuthenticatedPrincipal
  ) {
    return this.documents.finalize(id, principal);
  }
}
