import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { RolesGuard } from "./roles.guard.js";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthGuard, RolesGuard, AuthService],
  exports: [AuthGuard, RolesGuard, AuthService]
})
export class AuthModule {}
