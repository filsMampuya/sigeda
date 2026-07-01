import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditInterceptor } from "../shared/audit.interceptor.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { HealthModule } from "./health/health.module.js";
import { DepartmentsModule } from "./departments/departments.module.js";
import { UsersModule } from "./users/users.module.js";
import { DocumentsModule } from "./documents/documents.module.js";
import { FoldersModule } from "./folders/folders.module.js";
import { DocumentArchivesModule } from "./document-archives/document-archives.module.js";
import { AttachmentsModule } from "./attachments/attachments.module.js";
import { SearchModule } from "./search/search.module.js";
import { AuditModule } from "./audit/audit.module.js";
import { PhysicalArchivesModule } from "./physical-archives/physical-archives.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { DocumentIntelligenceModule } from "./document-intelligence/document-intelligence.module.js";
import { DocumentTypesModule } from "./document-types/document-types.module.js";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HealthModule,
    DepartmentsModule,
    UsersModule,
    DocumentsModule,
    FoldersModule,
    DocumentArchivesModule,
    AttachmentsModule,
    SearchModule,
    AuditModule,
    PhysicalArchivesModule,
    DashboardModule,
    DocumentIntelligenceModule,
    DocumentTypesModule
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor
    }
  ]
})
export class AppModule {}
