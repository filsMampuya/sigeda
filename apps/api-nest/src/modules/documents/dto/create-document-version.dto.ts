import { Transform, type TransformFnParams } from "class-transformer";
import { ArrayUnique, IsArray, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { optionalTrimmedString, parseJsonArray, parseStringArray } from "../../../shared/transformers.js";
import { CreateDocumentRecipientTargetDto } from "./create-document.dto.js";

export class CreateDocumentVersionDto {
  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsString()
  @MaxLength(1200)
  changeSummary!: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(220)
  title?: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(400)
  subject?: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(60)
  type?: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsUUID()
  documentTypeId?: string;

  @Transform(({ value }: TransformFnParams) => parseStringArray(value))
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  receiverDirectionIds?: string[];

  @Transform(({ value }: TransformFnParams) => parseStringArray(value))
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  copyDirectionIds?: string[];

  @Transform(({ value }: TransformFnParams) => parseJsonArray<CreateDocumentRecipientTargetDto>(value))
  @IsOptional()
  @IsArray()
  copyTargets?: CreateDocumentRecipientTargetDto[];

  @Transform(({ value }: TransformFnParams) => parseStringArray(value))
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  sourceAnnotationIds?: string[];
}
