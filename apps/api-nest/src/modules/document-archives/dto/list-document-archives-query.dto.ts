import { Transform, type TransformFnParams } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { parseInteger, trimString } from "../../../shared/transformers.js";

export class ListDocumentArchivesQueryDto {
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
  serviceId?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  bureauId?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  partnerDirectionId?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  annotationDirectionId?: string;

  @IsOptional()
  @IsEnum(["with", "without"] as const)
  annotationState?: "with" | "without";

  @IsOptional()
  @IsEnum(["ENTREE", "SORTIE"] as const)
  section?: "ENTREE" | "SORTIE";

  @IsOptional()
  @IsEnum(["reference", "title", "movementType", "direction", "status", "year", "archivedAt"] as const)
  sortBy?: "reference" | "title" | "movementType" | "direction" | "status" | "year" | "archivedAt";

  @IsOptional()
  @IsEnum(["asc", "desc"] as const)
  sortDir?: "asc" | "desc";

  @IsOptional()
  @IsEnum(["archivedAt", "updatedAt"] as const)
  dateField?: "archivedAt" | "updatedAt";

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

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  annotationDateFrom?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  annotationDateTo?: string;
}
