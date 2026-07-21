import { Transform, type TransformFnParams } from "class-transformer";
import { ArrayUnique, IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { parseInteger, parseStringArray, trimString } from "../../../shared/transformers.js";

const FOLDER_TYPE = {
  CORRESPONDANCE: "CORRESPONDANCE",
  DOCUMENTAIRE: "DOCUMENTAIRE",
  AUTRE: "AUTRE"
} as const;

const FOLDER_STATUS = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED"
} as const;

type FolderType = (typeof FOLDER_TYPE)[keyof typeof FOLDER_TYPE];
type FolderStatus = (typeof FOLDER_STATUS)[keyof typeof FOLDER_STATUS];

export class CreateFolderDto {
  @Transform(({ value }: TransformFnParams) => parseInteger(value))
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsOptional()
  @IsEnum(FOLDER_TYPE)
  folderType?: FolderType;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  label?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  @IsUUID()
  partnerDirectionId?: string;

  @Transform(({ value }: TransformFnParams) => parseStringArray(value))
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  documentTypeIds?: string[];
}

export class UpdateFolderStatusDto {
  @IsEnum(FOLDER_STATUS)
  status!: FolderStatus;
}
