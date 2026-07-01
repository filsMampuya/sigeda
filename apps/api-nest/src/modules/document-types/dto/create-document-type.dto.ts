import { Transform, type TransformFnParams } from "class-transformer";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";
import { optionalTrimmedString } from "../../../shared/transformers.js";

export class CreateDocumentTypeDto {
  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsString()
  @MaxLength(80)
  code!: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsString()
  @MaxLength(160)
  label!: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
