import { IsIn, IsOptional } from "class-validator";

export class AnalyzeDocumentDto {
  @IsOptional()
  @IsIn(["vision", "ocr", "auto"])
  mode?: "vision" | "ocr" | "auto";
}
