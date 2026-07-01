import { Transform, type TransformFnParams } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { parseInteger } from "../../../shared/transformers.js";

export class ListUsersQueryDto {
  @Transform(({ value }: TransformFnParams) => (value === undefined ? undefined : parseInteger(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Transform(({ value }: TransformFnParams) => (value === undefined ? undefined : parseInteger(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number;

  @Transform(({ value }: TransformFnParams) => {
    if (value === undefined) {
      return undefined;
    }
    return String(value).trim().toLowerCase() === "true";
  })
  @IsOptional()
  @IsBoolean()
  includePending?: boolean;

  @Transform(({ value }: TransformFnParams) => (typeof value === "string" ? value.trim().toUpperCase() : value))
  @IsOptional()
  @IsIn(["ACTIVE", "PENDING_COMPLETION", "INACTIVE"])
  directoryStatus?: "ACTIVE" | "PENDING_COMPLETION" | "INACTIVE";
}
