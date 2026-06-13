import { FolderStatus } from "@sigeda/database";
import { Transform, type TransformFnParams } from "class-transformer";
import { IsEnum, IsInt, IsString, IsUUID, Max, Min } from "class-validator";
import { parseInteger, trimString } from "../../../shared/transformers.js";

export class CreateFolderDto {
  @Transform(({ value }: TransformFnParams) => parseInteger(value))
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @IsUUID()
  partnerDirectionId!: string;
}

export class UpdateFolderStatusDto {
  @IsEnum(FolderStatus)
  status!: FolderStatus;
}
