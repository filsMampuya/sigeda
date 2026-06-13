import { DepartmentType } from "@sigeda/database";
import { Transform, type TransformFnParams } from "class-transformer";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { optionalTrimmedString, trimString } from "../../../shared/transformers.js";

export class CreateDepartmentDto {
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @MaxLength(32)
  code!: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @MaxLength(180)
  designation!: string;

  @IsEnum(DepartmentType)
  type!: DepartmentType;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsUUID()
  directionId?: string | null;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsUUID()
  serviceId?: string | null;
}
