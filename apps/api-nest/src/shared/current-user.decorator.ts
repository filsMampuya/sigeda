import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedPrincipal } from "../modules/auth/auth.types.js";

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedPrincipal }>();
  return request.user;
});
