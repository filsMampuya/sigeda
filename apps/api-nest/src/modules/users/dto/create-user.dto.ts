import { Transform, type TransformFnParams } from "class-transformer";
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { trimString } from "../../../shared/transformers.js";

export class CreateUserDto {
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsIn(["CREATE", "COMPLETE"])
  mode?: "CREATE" | "COMPLETE";

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  pendingUserId?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @MaxLength(40)
  matricule!: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @MaxLength(120)
  nom!: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @MaxLength(120)
  prenom!: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  functionTitle?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @Matches(/^[A-Z_]+$/)
  roleCode!: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @MaxLength(32)
  bureauCode!: string;
}
