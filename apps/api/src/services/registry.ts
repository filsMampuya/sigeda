import {
  createAuditLogRepository,
  createDepartementRepository,
  createDocumentRepository,
  createUserRepository
} from "../repositories/repository-factory";
import { AuthorizationService } from "./authorization-service";
import { BaseCrudService } from "./base-crud-service";
import { DashboardService } from "./dashboard-service";
import { DepartementService } from "./departement-service";
import { DocumentStorageService } from "./document-storage-service";
import { DocumentService } from "./document-service";
import { FileUrlService } from "./file-url-service";
import { OcrService } from "./ocr-service";
import { OrganizationService } from "./organization-service";
import { UserProfileService } from "./user-profile-service";
import { UserService } from "./user-service";

const departementRepository = createDepartementRepository();
const documentRepository = createDocumentRepository();
const userRepository = createUserRepository();
const auditLogRepository = createAuditLogRepository();
const authorizationService = new AuthorizationService();
const fileUrlService = new FileUrlService();
const documentStorageService = new DocumentStorageService(fileUrlService);
const ocrService = new OcrService();

export const organizationService = new OrganizationService(departementRepository);
export const departementService = new DepartementService(departementRepository);
export const userService = new UserService(userRepository, departementRepository);
export const userProfileService = new UserProfileService(userRepository);
export const auditLogService = new BaseCrudService(auditLogRepository);
export const documentService = new DocumentService(
  documentRepository,
  departementRepository,
  userRepository,
  authorizationService,
  documentStorageService,
  ocrService,
  auditLogService
);
export const dashboardService = new DashboardService(documentRepository, auditLogRepository);
