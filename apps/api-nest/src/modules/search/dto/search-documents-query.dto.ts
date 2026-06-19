import { Transform, type TransformFnParams } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { parseInteger, trimString } from "../../../shared/transformers.js";

export class SearchDocumentsQueryDto {
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  q?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  status?: string;

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
  emitterDirectionId?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  receiverDirectionId?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  copyDirectionId?: string;

  @IsOptional()
  @IsEnum(["all", "emitted", "received"] as const)
  directionScope?: "all" | "emitted" | "received";

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
  folderId?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsEnum(["contains", "equals"] as const)
  referenceOperator?: "contains" | "equals";

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsEnum(["contains", "equals"] as const)
  subjectOperator?: "contains" | "equals";

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsEnum(["ENTREE", "SORTIE"] as const)
  movementType?: "ENTREE" | "SORTIE";

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  signerName?: string;

  @IsOptional()
  @IsEnum(["contains", "equals"] as const)
  signerNameOperator?: "contains" | "equals";

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  confidentialityLevel?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  createdDate?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  annotationDirectionId?: string;

  @IsOptional()
  @IsEnum(["with", "without"] as const)
  annotationState?: "with" | "without";

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  annotationDateFrom?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  annotationDateTo?: string;

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

  @IsOptional()
  @IsEnum(["reference", "title", "type", "direction", "movementType", "status", "confidentiality", "createdAt", "updatedAt"] as const)
  sortBy?: "reference" | "title" | "type" | "direction" | "movementType" | "status" | "confidentiality" | "createdAt" | "updatedAt";

  @IsOptional()
  @IsEnum(["asc", "desc"] as const)
  sortDir?: "asc" | "desc";

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
}
