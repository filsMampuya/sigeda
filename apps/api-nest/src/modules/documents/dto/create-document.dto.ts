import { DepartmentType } from "@sigeda/database";
import { Transform, Type, type TransformFnParams } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested
} from "class-validator";
import {
  optionalTrimmedString,
  parseInteger,
  parseJsonArray,
  parseStringArray
} from "../../../shared/transformers.js";

export class CreateDocumentSignerDto {
  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  functionTitle?: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsEnum(DepartmentType)
  departmentType?: DepartmentType;

  @Transform(({ value }: TransformFnParams) => (value === undefined ? undefined : parseInteger(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  signingOrder?: number;
}

export class CreateDocumentDto {
  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  numeroReference?: string;

  @Transform(({ value }: TransformFnParams) => (value === undefined ? undefined : parseInteger(value)))
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  referenceNumber?: number;

  @Transform(({ value }: TransformFnParams) => (value === undefined ? undefined : parseInteger(value)))
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

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
  @MaxLength(60)
  type?: string;

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsUUID()
  emitterDirectionId?: string;

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

  @Transform(({ value }: TransformFnParams) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  signerName?: string;

  @Transform(({ value }: TransformFnParams) => parseJsonArray<CreateDocumentSignerDto>(value))
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentSignerDto)
  signers?: CreateDocumentSignerDto[];
}
