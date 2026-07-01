import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { UserDirectorySource, UserDirectoryStatus, type Prisma } from "@sigeda/database";
import { documentIntelligenceResultSchema } from "@sigeda/shared/schemas";
import type {
  DepartmentType,
  DocumentIntelligenceAnalyzeResponse,
  DocumentIntelligenceReadiness,
  DocumentIntelligenceRequestedMode,
  DocumentIntelligenceResult,
  DocumentIntelligenceResultView
} from "@sigeda/shared/types";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { DocumentIntelligenceRepository } from "./document-intelligence.repository.js";
import { DocumentIntelligenceStorageService } from "./document-intelligence-storage.service.js";
import { extractFromOcrTextChain } from "./chains/extract-from-ocr-text.chain.js";
import { extractFromVisionChain } from "./chains/extract-from-vision.chain.js";
import { summarizeDocumentContentChain } from "./chains/summarize-document-content.chain.js";
import { TesseractCliProvider } from "./ocr/tesseract-cli.provider.js";
import { OllamaProvider } from "./providers/ollama.provider.js";
import { applyConfidenceDefaults, isLowConfidence } from "./utils/confidence.js";
import { documentIntelligenceDebugLog } from "./utils/document-intelligence-debug.js";
import { cleanupWorkspace, convertPdfFirstPageToPng, createWorkspace, writeSourceFile } from "./utils/file-preprocessing.js";
import { extractDocumentFromOcrHeuristics } from "./utils/extract-from-ocr-heuristics.js";
import { resolveRequestedMode, shouldRunOcrFallback, shouldRunVision } from "./utils/mode-selector.js";
import { buildDirectionMatch } from "./utils/referential-matcher.js";

type DepartmentReference = {
  id: string;
  code: string;
  designation: string;
  type: DepartmentType;
};

@Injectable()
export class DocumentIntelligenceService {
  constructor(
    private readonly repository: DocumentIntelligenceRepository,
    private readonly prisma: PrismaService,
    private readonly storage: DocumentIntelligenceStorageService,
    private readonly ollama: OllamaProvider,
    private readonly tesseract: TesseractCliProvider
  ) {}

  async analyze(
    input: {
      mode?: DocumentIntelligenceRequestedMode;
      file?: Express.Multer.File;
    },
    principal: AuthenticatedPrincipal
  ): Promise<DocumentIntelligenceAnalyzeResponse> {
    if (!input.file) {
      throw new BadRequestException("Le fichier a analyser est obligatoire.");
    }

    const analyzeStartedAt = Date.now();
    const user = await this.resolveAuthenticatedUser(principal);
    const requestedMode = resolveRequestedMode(input.mode);
    documentIntelligenceDebugLog("analyze.received", {
      requestedMode,
      fileName: input.file.originalname,
      mimeType: input.file.mimetype,
      sizeBytes: input.file.size,
      userId: user.id
    });
    await this.ensureRequestedModeAvailability(requestedMode);

    const job = await this.repository.create({
      user: {
        connect: { id: user.id }
      },
      originalFileName: input.file.originalname,
      bucket: "__pending__",
      objectKey: "__pending__",
      mimeType: input.file.mimetype,
      sizeBytes: BigInt(input.file.size),
      requestedMode,
      status: "PENDING"
    });

    const uploaded = await this.storage.uploadTemporarySourceFile({
      jobId: job.id,
      file: input.file
    });

    await this.repository.update(job.id, {
      bucket: uploaded.bucket,
      objectKey: uploaded.objectKey,
      status: "UPLOADED"
    });

    documentIntelligenceDebugLog("analyze.accepted", {
      jobId: job.id,
      requestedMode,
      acceptDurationMs: Date.now() - analyzeStartedAt
    });

    void this.processJob(job.id, input.file, requestedMode).catch(async (error) => {
      documentIntelligenceDebugLog("job.failed", {
        jobId: job.id,
        error: stringifyError(error)
      });
      await this.repository.updateStatus(job.id, "FAILED", {
        effectiveMode: null,
        errorCode: "PIPELINE_ERROR",
        errorMessage: stringifyError(error),
        finishedAt: new Date()
      });
    });

    return {
      jobId: job.id,
      status: "UPLOADED"
    };
  }

  async getReadiness(): Promise<DocumentIntelligenceReadiness> {
    const defaultMode = resolveRequestedMode(process.env.DOCUMENT_AI_MODE);
    const visionBaseUrl = process.env.DOCUMENT_AI_VISION_BASE_URL ?? "http://localhost:11434";
    const textBaseUrl = process.env.DOCUMENT_AI_TEXT_BASE_URL ?? visionBaseUrl;
    const visionModel = process.env.DOCUMENT_AI_VISION_MODEL ?? "moondream";
    const textModel = process.env.DOCUMENT_AI_TEXT_MODEL ?? "qwen2.5:0.5b";
    const ocrLanguage = process.env.OCR_LANGUAGE ?? "fra+eng";

    const [visionProvider, textProvider, ocrProvider] = await Promise.all([
      this.ollama.checkAvailability({
        baseUrl: visionBaseUrl,
        model: visionModel
      }),
      this.ollama.checkAvailability({
        baseUrl: textBaseUrl,
        model: textModel
      }),
      this.tesseract.checkAvailability()
    ]);

    const modes = {
      vision: {
        available: visionProvider.available,
        reason: visionProvider.reason
      },
      ocr: {
        available: ocrProvider.available,
        reason: ocrProvider.reason ?? (textProvider.available ? null : textProvider.reason)
      },
      auto: {
        available: visionProvider.available || ocrProvider.available,
        reason:
          visionProvider.available || ocrProvider.available
            ? null
            : firstReason(visionProvider.reason, ocrProvider.reason, textProvider.reason)
      }
    } satisfies DocumentIntelligenceReadiness["modes"];

    const available = modes[defaultMode].available;

    return {
      available,
      defaultMode,
      modes,
      providers: {
        vision: {
          available: visionProvider.available,
          provider: "ollama",
          model: visionModel,
          baseUrl: visionBaseUrl,
          reason: visionProvider.reason
        },
        text: {
          available: textProvider.available,
          provider: "ollama",
          model: textModel,
          baseUrl: textBaseUrl,
          reason: textProvider.reason
        },
        ocr: {
          available: ocrProvider.available,
          provider: "tesseract-cli",
          language: ocrLanguage,
          reason: ocrProvider.reason
        }
      },
      message: buildReadinessMessage(defaultMode, modes)
    };
  }

  async getJob(id: string, principal: AuthenticatedPrincipal) {
    const user = await this.resolveAuthenticatedUser(principal);
    const job = await this.repository.findOwnedByUser(id, user.id);

    if (!job) {
      throw new NotFoundException("Analyse documentaire introuvable.");
    }

    return {
      id: job.id,
      status: job.status,
      requestedMode: normalizeRequestedMode(job.requestedMode),
      effectiveMode: normalizeEffectiveMode(job.effectiveMode),
      confidenceScore: job.confidenceScore ? Number(job.confidenceScore) : null,
      errorCode: job.errorCode ?? null,
      errorMessage: job.errorMessage ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString()
    };
  }

  async getResult(id: string, principal: AuthenticatedPrincipal): Promise<DocumentIntelligenceResultView> {
    const user = await this.resolveAuthenticatedUser(principal);
    const job = await this.repository.findOwnedByUser(id, user.id);

    if (!job) {
      throw new NotFoundException("Resultat d'analyse introuvable.");
    }

    if (!job.extractedJson) {
      throw new NotFoundException("Le resultat d'analyse n'est pas encore disponible.");
    }

    const result = documentIntelligenceResultSchema.parse(job.extractedJson) as DocumentIntelligenceResult;
    const departments = await this.loadDepartmentReferences();

    return {
      job: {
        id: job.id,
        status: job.status,
        requestedMode: normalizeRequestedMode(job.requestedMode),
        effectiveMode: normalizeEffectiveMode(job.effectiveMode),
        confidenceScore: job.confidenceScore ? Number(job.confidenceScore) : null,
        errorCode: job.errorCode ?? null,
        errorMessage: job.errorMessage ?? null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString()
      },
      result,
      matching: {
        emitterDirection: buildDirectionMatch(result.emitterDirection, departments),
        receiverDirections: result.receiverDirections
          .map((label) => buildDirectionMatch(label, departments))
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
        copyDirections: result.copyDirections
          .map((label) => buildDirectionMatch(label, departments))
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
        signers: await this.buildSignerMatches(result.signers)
      }
    };
  }

  private async processJob(
    jobId: string,
    file: Express.Multer.File,
    requestedMode: DocumentIntelligenceRequestedMode
  ) {
    const startedAt = Date.now();
    await this.repository.update(jobId, {
      startedAt: new Date()
    });
    documentIntelligenceDebugLog("job.started", {
      jobId,
      requestedMode,
      mimeType: file.mimetype,
      sizeBytes: file.size
    });

    let visionResult: DocumentIntelligenceResult | null = null;
    let visionModelName: string | null = null;
    let visionError: unknown = null;
    const canRunVision =
      shouldRunVision(requestedMode) &&
      (requestedMode === "vision" ? true : await this.isVisionProviderAvailable());

    if (canRunVision) {
      try {
        const vision = await this.runVisionExtraction(jobId, file);
        visionResult = vision.result;
        visionModelName = vision.modelName;
        documentIntelligenceDebugLog("job.vision.completed", {
          jobId,
          modelName: visionModelName,
          confidenceScore: visionResult.confidenceScore
        });
      } catch (error) {
        visionError = error;
        documentIntelligenceDebugLog("job.vision.failed", {
          jobId,
          error: stringifyError(error)
        });
      }
    }

    const shouldFallback = shouldRunOcrFallback({
      requestedMode,
      mimeType: file.mimetype,
      visionResult,
      visionError
    });

    if (!shouldFallback) {
      if (visionResult) {
        const enrichedVisionResult = await this.enrichAdministrativeSummary(visionResult);
        await this.persistCompletedResult(jobId, enrichedVisionResult, {
          effectiveMode: "vision",
          modelName: visionModelName,
          ocrProvider: null
        });
        documentIntelligenceDebugLog("job.completed", {
          jobId,
          effectiveMode: "vision",
          totalDurationMs: Date.now() - startedAt
        });
        return;
      }

      throw visionError instanceof Error
        ? visionError
        : new ServiceUnavailableException("Le mode vision n'a retourne aucun resultat exploitable.");
    }

    const ocr = await this.runOcrExtraction(jobId, file);
    const effectiveMode = visionResult ? "hybrid" : "ocr";

    await this.persistCompletedResult(
      jobId,
      {
        ...ocr.result,
        extractionMode: effectiveMode
      },
      {
        effectiveMode,
        modelName: ocr.modelName,
        ocrProvider: "tesseract-cli"
      }
    );
    documentIntelligenceDebugLog("job.completed", {
      jobId,
      effectiveMode,
      modelName: ocr.modelName,
      totalDurationMs: Date.now() - startedAt
    });
  }

  private async runVisionExtraction(jobId: string, file: Express.Multer.File) {
    const startedAt = Date.now();
    await this.repository.updateStatus(jobId, "VISION_RUNNING");
    const imageBuffers = await this.prepareVisionBuffers(file);
    const model = process.env.DOCUMENT_AI_VISION_MODEL ?? "moondream";

    await this.repository.updateStatus(jobId, "LLM_RUNNING");

    const result = await extractFromVisionChain({
      provider: this.ollama,
      model,
      imageBuffers
    });
    documentIntelligenceDebugLog("vision.pipeline.done", {
      jobId,
      model,
      pageCount: imageBuffers.length,
      durationMs: Date.now() - startedAt
    });
    return result;
  }

  private async runOcrExtraction(jobId: string, file: Express.Multer.File) {
    const startedAt = Date.now();
    await this.repository.updateStatus(jobId, "OCR_RUNNING");
    const ocrOutput = await this.tesseract.extractText({
      fileBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype
    });
    const heuristicResult = extractDocumentFromOcrHeuristics(ocrOutput.text);
    documentIntelligenceDebugLog("ocr.completed", {
      jobId,
      durationMs: ocrOutput.durationMs,
      pageCount: ocrOutput.pageCount,
      warnings: ocrOutput.warnings,
      rawTextLength: ocrOutput.text.length,
      heuristicConfidence: heuristicResult?.confidenceScore ?? null
    });

    if (heuristicResult && isHeuristicFastPathEligible(heuristicResult)) {
      const summaryEnrichedResult = await this.enrichAdministrativeSummary(heuristicResult, ocrOutput.text);
      documentIntelligenceDebugLog("ocr.fast-path", {
        jobId,
        durationMs: Date.now() - startedAt,
        confidenceScore: summaryEnrichedResult.confidenceScore,
        reference: summaryEnrichedResult.reference,
        subject: summaryEnrichedResult.subject,
        summary: summaryEnrichedResult.summary
      });
      return {
        result: summaryEnrichedResult,
        modelName: "heuristic-ocr"
      };
    }

    const textProviderAvailable = await this.isTextProviderAvailable();

    if (!textProviderAvailable) {
      if (heuristicResult) {
        const summaryEnrichedResult = await this.enrichAdministrativeSummary(heuristicResult, ocrOutput.text);
        documentIntelligenceDebugLog("ocr.heuristic-provider-fallback", {
          jobId,
          durationMs: Date.now() - startedAt,
          confidenceScore: summaryEnrichedResult.confidenceScore,
          reference: summaryEnrichedResult.reference,
          subject: summaryEnrichedResult.subject,
          summary: summaryEnrichedResult.summary
        });
        return {
          result: summaryEnrichedResult,
          modelName: "heuristic-ocr:fallback-no-llm"
        };
      }

      throw new ServiceUnavailableException(
        "Le provider texte local est indisponible et l'OCR heuristique n'a pas produit de resultat exploitable."
      );
    }

    const model = process.env.DOCUMENT_AI_TEXT_MODEL ?? "qwen2.5:0.5b";

    await this.repository.updateStatus(jobId, "LLM_RUNNING");

    const llmResult = await extractFromOcrTextChain({
      provider: this.ollama,
      model,
      text: ocrOutput.text
    });
    const summaryEnrichedResult = await this.enrichAdministrativeSummary(llmResult.result, ocrOutput.text);
    documentIntelligenceDebugLog("ocr.llm-fallback.completed", {
      jobId,
      model,
      durationMs: Date.now() - startedAt,
      confidenceScore: summaryEnrichedResult.confidenceScore,
      summary: summaryEnrichedResult.summary
    });
    return {
      result: summaryEnrichedResult,
      modelName: llmResult.modelName
    };
  }

  private async prepareVisionBuffers(file: Express.Multer.File) {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      return [file.buffer];
    }

    if (file.mimetype === "application/pdf") {
      const workspace = await createWorkspace("document-intelligence-vision");

      try {
        const sourcePath = await writeSourceFile(workspace, file.originalname, file.buffer);
        return [await convertPdfFirstPageToPng(workspace, sourcePath)];
      } finally {
        await cleanupWorkspace(workspace);
      }
    }

    throw new ServiceUnavailableException("Le type de fichier n'est pas encore supporte par le mode vision.");
  }

  private async persistCompletedResult(
    jobId: string,
    result: DocumentIntelligenceResult,
    input: {
      effectiveMode: "vision" | "ocr" | "hybrid";
      modelName?: string | null;
      ocrProvider?: string | null;
    }
  ) {
    const normalized = applyConfidenceDefaults(result);
    const lowConfidence = isLowConfidence(normalized);

    await this.repository.update(jobId, {
      status: lowConfidence ? "LOW_CONFIDENCE" : "COMPLETED",
      effectiveMode: input.effectiveMode,
      llmProvider: "ollama",
      ocrProvider: input.ocrProvider ?? null,
      modelName: input.modelName ?? null,
      extractedJson: normalized as unknown as Prisma.InputJsonValue,
      rawExtractedText: normalized.rawExtractedText || null,
      confidenceScore: normalized.confidenceScore,
      errorCode: lowConfidence ? "LOW_CONFIDENCE" : null,
      errorMessage: lowConfidence ? "L'analyse est terminee mais la confiance est insuffisante." : null,
      finishedAt: new Date()
    });

    await this.upsertPendingDirectoryUsersFromResult(normalized);
  }

  private async isVisionProviderAvailable() {
    const availability = await this.ollama.checkAvailability({
      baseUrl: process.env.DOCUMENT_AI_VISION_BASE_URL ?? "http://localhost:11434",
      model: process.env.DOCUMENT_AI_VISION_MODEL ?? "moondream"
    });

    return availability.available;
  }

  private async isTextProviderAvailable() {
    const availability = await this.ollama.checkAvailability({
      baseUrl: process.env.DOCUMENT_AI_TEXT_BASE_URL ?? process.env.DOCUMENT_AI_VISION_BASE_URL ?? "http://localhost:11434",
      model: process.env.DOCUMENT_AI_TEXT_MODEL ?? "qwen2.5:0.5b"
    });

    return availability.available;
  }

  private async enrichAdministrativeSummary(result: DocumentIntelligenceResult, rawText?: string) {
    const preparedFallbackSummary = result.summary.trim();
    const sourceText = rawText?.trim() || result.rawExtractedText?.trim() || "";

    if (!sourceText) {
      return result;
    }

    const textProviderAvailable = await this.isTextProviderAvailable();

    if (!textProviderAvailable) {
      return result;
    }

    const model = process.env.DOCUMENT_AI_TEXT_MODEL ?? "qwen2.5:0.5b";

    try {
      const summaryResult = await summarizeDocumentContentChain({
        provider: this.ollama,
        model,
        text: sourceText,
        extracted: {
          reference: result.reference,
          title: result.title,
          subject: result.subject,
          documentDate: result.documentDate,
          emitterDirection: result.emitterDirection,
          receiverDirections: result.receiverDirections,
          copyDirections: result.copyDirections,
          documentType: result.documentType
        }
      });

      if (!summaryResult.summary.trim()) {
        return result;
      }

      const preferredSummary = choosePreferredAdministrativeSummary({
        currentSummary: preparedFallbackSummary,
        candidateSummary: summaryResult.summary
      });

      if (preferredSummary !== summaryResult.summary) {
        documentIntelligenceDebugLog("summary.enriched.skipped", {
          reference: result.reference,
          currentSummary: preparedFallbackSummary,
          candidateSummary: summaryResult.summary
        });

        return result;
      }

      documentIntelligenceDebugLog("summary.enriched", {
        model: summaryResult.modelName,
        reference: result.reference,
        previousSummary: preparedFallbackSummary,
        nextSummary: preferredSummary
      });

      return {
        ...result,
        summary: preferredSummary,
        fieldConfidence: {
          ...result.fieldConfidence,
          summary: 0.92
        }
      };
    } catch (error) {
      documentIntelligenceDebugLog("summary.enrich.failed", {
        reference: result.reference,
        error: stringifyError(error)
      });
      return result;
    }
  }

  private async resolveAuthenticatedUser(principal: AuthenticatedPrincipal) {
    const user =
      (await this.prisma.user.findUnique({
        where: { keycloakId: principal.sub }
      })) ??
      (principal.email
        ? await this.prisma.user.findFirst({
            where: {
              email: {
                equals: principal.email.trim().toLowerCase(),
                mode: "insensitive"
              }
            }
          })
        : null);

    if (!user) {
      throw new NotFoundException("Utilisateur authentifie introuvable.");
    }

    return user;
  }

  private async loadDepartmentReferences(): Promise<DepartmentReference[]> {
    return this.prisma.department.findMany({
      select: {
        id: true,
        code: true,
        designation: true,
        type: true
      },
      orderBy: {
        designation: "asc"
      }
    });
  }

  private async buildSignerMatches(signers: string[]) {
    const signerNames = Array.from(new Set(signers.map((value) => value.trim()).filter(Boolean)));

    if (!signerNames.length) {
      return [];
    }

    const parsedNames = signerNames.map((signerName) => ({
      signerName,
      parsed: splitDetectedPersonName(signerName)
    }));

    const users = await this.prisma.user.findMany({
      where: {
        OR: parsedNames.map(({ parsed }) => ({
          nom: {
            equals: parsed.nom,
            mode: "insensitive" as const
          },
          prenom: {
            equals: parsed.prenom,
            mode: "insensitive" as const
          }
        }))
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        directoryStatus: true
      }
    });

    return parsedNames.map(({ signerName, parsed }) => {
      const matches = users.filter(
        (user) =>
          user.nom.trim().toLowerCase() === parsed.nom.trim().toLowerCase() &&
          user.prenom.trim().toLowerCase() === parsed.prenom.trim().toLowerCase()
      );

      if (matches.length === 1) {
        return {
          status: "matched" as const,
          label: signerName,
          matchedUserId: matches[0].id,
          matchedUserIds: [matches[0].id],
          directoryStatus: matches[0].directoryStatus
        };
      }

      if (matches.length > 1) {
        return {
          status: "ambiguous" as const,
          label: signerName,
          matchedUserIds: matches.map((user) => user.id)
        };
      }

      return {
        status: "unmatched" as const,
        label: signerName
      };
    });
  }

  private async ensureRequestedModeAvailability(requestedMode: DocumentIntelligenceRequestedMode) {
    const readiness = await this.getReadiness();

    if (!readiness.modes[requestedMode].available) {
      throw new ServiceUnavailableException(
        readiness.modes[requestedMode].reason ??
          `Le moteur Document Intelligence n'est pas pret pour le mode ${requestedMode}.`
      );
    }
  }

  private async upsertPendingDirectoryUsersFromResult(result: DocumentIntelligenceResult) {
    const signerNames = Array.from(new Set(result.signers.map((value) => value.trim()).filter(Boolean)));

    if (!signerNames.length || result.confidenceScore < 0.55) {
      return;
    }

    const role = await this.prisma.role.findUnique({
      where: { code: "AGENT" },
      select: { id: true }
    });

    if (!role) {
      return;
    }

    const departmentId = await this.resolveEmitterDepartmentId(result.emitterDirection);

    for (const signerName of signerNames) {
      const parsedName = splitDetectedPersonName(signerName);

      const existing = await this.prisma.user.findFirst({
        where: {
          nom: {
            equals: parsedName.nom,
            mode: "insensitive"
          },
          prenom: {
            equals: parsedName.prenom,
            mode: "insensitive"
          }
        },
        select: {
          id: true,
          directoryStatus: true
        }
      });

      if (existing && existing.directoryStatus !== UserDirectoryStatus.PENDING_COMPLETION) {
        continue;
      }

      if (existing) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            roleId: role.id,
            departmentId: departmentId ?? undefined,
            isActive: false,
            directoryStatus: UserDirectoryStatus.PENDING_COMPLETION,
            directorySource: UserDirectorySource.DOCUMENT_INTELLIGENCE
          }
        });
        continue;
      }

      await this.prisma.user.create({
        data: {
          nom: parsedName.nom,
          prenom: parsedName.prenom,
          roleId: role.id,
          departmentId: departmentId ?? undefined,
          isActive: false,
          directoryStatus: UserDirectoryStatus.PENDING_COMPLETION,
          directorySource: UserDirectorySource.DOCUMENT_INTELLIGENCE
        }
      });
    }
  }

  private async resolveEmitterDepartmentId(emitterDirectionLabel: string) {
    const normalized = emitterDirectionLabel.trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    const department = await this.prisma.department.findFirst({
      where: {
        OR: [
          {
            designation: {
              equals: emitterDirectionLabel.trim(),
              mode: "insensitive"
            }
          },
          {
            code: {
              equals: emitterDirectionLabel.trim(),
              mode: "insensitive"
            }
          }
        ]
      },
      select: {
        id: true
      }
    });

    return department?.id ?? null;
  }
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function normalizeRequestedMode(value: string): DocumentIntelligenceRequestedMode {
  if (value === "vision" || value === "ocr") {
    return value;
  }

  return "auto";
}

function normalizeEffectiveMode(value: string | null): DocumentIntelligenceResultView["job"]["effectiveMode"] {
  if (value === "vision" || value === "ocr" || value === "hybrid") {
    return value;
  }

  return null;
}

function isHeuristicFastPathEligible(result: DocumentIntelligenceResult) {
  const hasCoreBusinessFields =
    result.reference.trim().length > 0 &&
    result.subject.trim().length > 0 &&
    result.summary.trim().length > 0 &&
    (result.emitterDirection.trim().length > 0 || result.receiverDirections.length > 0);

  if (!hasCoreBusinessFields) {
    return false;
  }

  return result.confidenceScore >= 0.58;
}

function buildReadinessMessage(
  defaultMode: DocumentIntelligenceRequestedMode,
  modes: DocumentIntelligenceReadiness["modes"]
) {
  if (modes[defaultMode].available) {
    return `Document Intelligence pret en mode ${defaultMode}.`;
  }

  return modes[defaultMode].reason ?? `Document Intelligence indisponible en mode ${defaultMode}.`;
}

function firstReason(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0) ?? null;
}

function choosePreferredAdministrativeSummary(input: {
  currentSummary: string;
  candidateSummary: string;
}) {
  const current = input.currentSummary.trim();
  const candidate = input.candidateSummary.trim();

  if (!candidate) {
    return current;
  }

  if (containsAdministrativeNoise(candidate)) {
    return current || candidate;
  }

  if (removesAdministrativeArticles(current, candidate)) {
    return current || candidate;
  }

  if (current && candidate.length > current.length + 40) {
    return current;
  }

  return candidate;
}

function containsAdministrativeNoise(value: string) {
  return /\b(souhaitons bonne reception|bonne reception|avec nos respects|veuillez agreer)\b/i.test(value);
}

function removesAdministrativeArticles(current: string, candidate: string) {
  if (!current) {
    return false;
  }

  const removesDeLaDirection =
    /\bde la Direction\b/i.test(current) &&
    !/\bde la Direction\b/i.test(candidate) &&
    /\bde Direction\b/i.test(candidate);
  const removesAttentionDeLaDirection =
    /\ba l'attention de la Direction\b/i.test(current) &&
    !/\ba l'attention de la Direction\b/i.test(candidate) &&
    /\ba l'attention de Direction\b/i.test(candidate);

  return removesDeLaDirection || removesAttentionDeLaDirection;
}

function splitDetectedPersonName(fullName: string) {
  const tokens = fullName
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean);

  if (tokens.length <= 1) {
    return {
      nom: tokens[0] ?? fullName.trim(),
      prenom: "A_COMPLETER"
    };
  }

  return {
    nom: tokens[0],
    prenom: tokens.slice(1).join(" ")
  };
}
