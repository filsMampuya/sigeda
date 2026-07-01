import { Transform, type TransformFnParams } from "class-transformer";
import { IsOptional, IsUUID } from "class-validator";
import { optionalTrimmedString } from "../../../shared/transformers.js";

export class ClassifyDocumentDto {
  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsUUID()
  bureauId?: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsUUID()
  folderId?: string;
}
