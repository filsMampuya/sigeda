import { Transform, type TransformFnParams } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { parseInteger, trimString } from "../../../shared/transformers.js";

export class ListFoldersQueryDto {
  @Transform(({ value }: TransformFnParams) => (value === undefined ? undefined : parseInteger(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Transform(({ value }: TransformFnParams) => (value === undefined ? undefined : parseInteger(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  q?: string;

  @Transform(({ value }: TransformFnParams) => (value === undefined ? undefined : parseInteger(value)))
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  directionId?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  partnerDirectionId?: string;

  @IsOptional()
  @IsEnum(["ENTREE", "SORTIE"] as const)
  section?: "ENTREE" | "SORTIE";

  @IsOptional()
  @IsEnum(["ACTIVE", "ARCHIVED"] as const)
  status?: "ACTIVE" | "ARCHIVED";

  @IsOptional()
  @IsEnum(["createdAt", "updatedAt"] as const)
  dateField?: "createdAt" | "updatedAt";

  @IsOptional()
  @IsEnum(["today", "week", "month", "quarter", "year", "previousYear", "custom"] as const)
  periodPreset?: "today" | "week" | "month" | "quarter" | "year" | "previousYear" | "custom";

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  dateTo?: string;
}
