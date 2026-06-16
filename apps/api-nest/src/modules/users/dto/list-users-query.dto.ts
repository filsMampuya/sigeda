import { Transform, type TransformFnParams } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { parseInteger } from "../../../shared/transformers.js";

export class ListUsersQueryDto {
  @Transform(({ value }: TransformFnParams) => (value === undefined ? undefined : parseInteger(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Transform(({ value }: TransformFnParams) => (value === undefined ? undefined : parseInteger(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number;
}
