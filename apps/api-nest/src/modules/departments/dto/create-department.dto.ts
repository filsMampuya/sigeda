import { Transform, type TransformFnParams } from "class-transformer";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { optionalTrimmedString, trimString } from "../../../shared/transformers.js";

const DEPARTMENT_TYPE = {
  DIRECTION_GENERALE: "DIRECTION_GENERALE",
  DIRECTION: "DIRECTION",
  SERVICE: "SERVICE",
  BUREAU: "BUREAU"
} as const;

type DepartmentType = (typeof DEPARTMENT_TYPE)[keyof typeof DEPARTMENT_TYPE];

export class CreateDepartmentDto {
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @MaxLength(32)
  code!: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @MaxLength(180)
  designation!: string;

  @IsEnum(DEPARTMENT_TYPE)
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
