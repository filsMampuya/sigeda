import { Transform, type TransformFnParams } from "class-transformer";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { optionalTrimmedString } from "../../../shared/transformers.js";

export class CreateDocumentAnnotationDto {
  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsUUID()
  sourceDirectionId!: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsUUID()
  documentVersionId?: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsString()
  @MaxLength(4000)
  content!: string;
}
