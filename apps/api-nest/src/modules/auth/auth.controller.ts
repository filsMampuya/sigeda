import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../shared/current-user.decorator.js";
import type { AuthenticatedPrincipal } from "./auth.types.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";

@UseGuards(AuthGuard)
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get("me")
  me(@CurrentUser() principal: AuthenticatedPrincipal) {
    return this.auth.me(principal);
  }
}
