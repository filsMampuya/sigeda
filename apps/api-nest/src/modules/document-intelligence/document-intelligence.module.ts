import { Module } from "@nestjs/common";
import { DocumentIntelligenceController } from "./document-intelligence.controller.js";
import { DocumentIntelligenceRepository } from "./document-intelligence.repository.js";
import { DocumentIntelligenceService } from "./document-intelligence.service.js";
import { DocumentIntelligenceStorageService } from "./document-intelligence-storage.service.js";
import { TesseractCliProvider } from "./ocr/tesseract-cli.provider.js";
import { OllamaProvider } from "./providers/ollama.provider.js";

@Module({
  controllers: [DocumentIntelligenceController],
  providers: [
    DocumentIntelligenceRepository,
    DocumentIntelligenceService,
    DocumentIntelligenceStorageService,
    OllamaProvider,
    TesseractCliProvider
  ]
})
export class DocumentIntelligenceModule {}
