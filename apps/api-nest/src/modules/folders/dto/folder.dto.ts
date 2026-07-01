import { FolderStatus, FolderType } from "@sigeda/database";
import { Transform, type TransformFnParams } from "class-transformer";
import { ArrayUnique, IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { parseInteger, parseStringArray, trimString } from "../../../shared/transformers.js";

export class CreateFolderDto {
  @Transform(({ value }: TransformFnParams) => parseInteger(value))
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsOptional()
  @IsEnum(FolderType)
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
  @IsEnum(FolderStatus)
  status!: FolderStatus;
}
