import {
  createAuditLogRepository,
  createArchiveFolderRepository,
  createDepartementRepository,
  createDocumentArchiveRepository,
  createDocumentRepository,
  createPhysicalArchiveRepository,
  createUserRepository
} from "../repositories/repository-factory";
import { AuthorizationService } from "./authorization-service";
import { ArchiveFolderQueryService } from "./archive-folder-query-service";
import { ArchiveFolderService } from "./archive-folder-service";
import { BaseCrudService } from "./base-crud-service";
import { DashboardService } from "./dashboard-service";
import { DepartementService } from "./departement-service";
import { DocumentArchiveService } from "./document-archive-service";
import { DocumentArchiveQueryService } from "./document-archive-query-service";
import { DocumentStorageService } from "./document-storage-service";
import { DocumentService } from "./document-service";
import { FileUrlService } from "./file-url-service";
import { OcrService } from "./ocr-service";
import { OrganizationService } from "./organization-service";
import { PhysicalArchiveQueryService } from "./physical-archive-query-service";
import { PhysicalArchiveService } from "./physical-archive-service";
import { UserProfileService } from "./user-profile-service";
import { UserService } from "./user-service";

const departementRepository = createDepartementRepository();
const documentRepository = createDocumentRepository();
const documentArchiveRepository = createDocumentArchiveRepository();
const physicalArchiveRepository = createPhysicalArchiveRepository();
const archiveFolderRepository = createArchiveFolderRepository();
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
export const archiveFolderService = new ArchiveFolderService(
  archiveFolderRepository,
  departementRepository,
  auditLogService
);
export const documentArchiveService = new DocumentArchiveService(
  documentArchiveRepository,
  departementRepository,
  archiveFolderService
);
export const documentArchiveQueryService = new DocumentArchiveQueryService(
  archiveFolderRepository,
  documentArchiveRepository,
  documentRepository,
  departementRepository,
  authorizationService
);
export const archiveFolderQueryService = new ArchiveFolderQueryService(
  archiveFolderRepository,
  documentArchiveRepository,
  physicalArchiveRepository,
  departementRepository
);
export const physicalArchiveService = new PhysicalArchiveService(
  physicalArchiveRepository,
  documentArchiveRepository,
  documentRepository,
  archiveFolderService
);
export const physicalArchiveQueryService = new PhysicalArchiveQueryService(
  physicalArchiveRepository,
  documentArchiveRepository,
  documentRepository,
  archiveFolderRepository,
  departementRepository,
  authorizationService
);
export const documentService = new DocumentService(
  documentRepository,
  departementRepository,
  userRepository,
  authorizationService,
  documentStorageService,
  ocrService,
  auditLogService,
  documentArchiveService
);
export const dashboardService = new DashboardService(documentRepository, auditLogRepository);
