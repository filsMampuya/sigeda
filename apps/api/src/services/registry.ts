import { createAuditLogRepository, createBureauRepository, createDirectionRepository, createDocumentRepository, createServiceRepository } from "../repositories/repository-factory";
import { AuthorizationService } from "./authorization-service";
import { BaseCrudService } from "./base-crud-service";
import { DashboardService } from "./dashboard-service";
import { DocumentStorageService } from "./document-storage-service";
import { DocumentService } from "./document-service";
import { FileUrlService } from "./file-url-service";
import { OcrService } from "./ocr-service";

const directionRepository = createDirectionRepository();
const serviceRepository = createServiceRepository();
const bureauRepository = createBureauRepository();
const documentRepository = createDocumentRepository();
const auditLogRepository = createAuditLogRepository();
const authorizationService = new AuthorizationService();
const fileUrlService = new FileUrlService();
const documentStorageService = new DocumentStorageService(fileUrlService);
const ocrService = new OcrService();

export const directionService = new BaseCrudService(directionRepository);
export const serviceService = new BaseCrudService(serviceRepository);
export const bureauService = new BaseCrudService(bureauRepository);
export const documentService = new DocumentService(
  documentRepository,
  authorizationService,
  documentStorageService,
  ocrService
);
export const auditLogService = new BaseCrudService(auditLogRepository);
export const dashboardService = new DashboardService(documentRepository, auditLogRepository);
