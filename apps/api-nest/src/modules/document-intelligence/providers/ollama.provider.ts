import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type {
  LocalLlmProvider,
  LocalLlmProviderOutput,
  TextExtractionInput,
  VisionExtractionInput
} from "./local-llm-provider.interface.js";

type OllamaChatResponse = {
  model: string;
  message?: {
    content?: string;
  };
};

type OllamaTagsResponse = {
  models?: Array<{
    model?: string;
    name?: string;
  }>;
};

@Injectable()
export class OllamaProvider implements LocalLlmProvider {
  async checkAvailability(input?: {
    baseUrl?: string;
    model?: string;
  }) {
    const baseUrl = input?.baseUrl ?? process.env.DOCUMENT_AI_VISION_BASE_URL ?? "http://localhost:11434";
    const requestedModel = input?.model?.trim();
    const timeoutMs = Number.parseInt(process.env.DOCUMENT_AI_TIMEOUT_MS ?? "60000", 10);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`, {
        method: "GET",
        signal: controller.signal
      });

      if (!response.ok) {
        return {
          available: false,
          reason: `Ollama a repondu ${response.status}.`
        };
      }

      const payload = (await response.json()) as OllamaTagsResponse;
      const models = (payload.models ?? [])
        .flatMap((item) => [item.model, item.name])
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

      if (requestedModel && !models.some((model) => modelMatches(requestedModel, model))) {
        return {
          available: false,
          reason: `Le modele ${requestedModel} n'est pas encore telecharge dans Ollama.`
        };
      }

      return {
        available: true,
        reason: null
      };
    } catch (error) {
      return {
        available: false,
        reason: `Provider Ollama indisponible: ${stringifyError(error)}`
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async extractStructuredFromVision(input: VisionExtractionInput): Promise<LocalLlmProviderOutput> {
    return this.chat({
      baseUrl: process.env.DOCUMENT_AI_VISION_BASE_URL ?? "http://localhost:11434",
      body: {
        model: input.model,
        stream: false,
        keep_alive: process.env.DOCUMENT_AI_OLLAMA_KEEP_ALIVE ?? "15m",
        format: "json",
        options: buildOllamaOptions(),
        messages: [
          {
            role: "user",
            content: input.prompt,
            images: input.imageBuffers.map((buffer) => buffer.toString("base64"))
          }
        ]
      }
    });
  }

  async extractStructuredFromText(input: TextExtractionInput): Promise<LocalLlmProviderOutput> {
    return this.chat({
      baseUrl: process.env.DOCUMENT_AI_TEXT_BASE_URL ?? "http://localhost:11434",
      body: {
        model: input.model,
        stream: false,
        keep_alive: process.env.DOCUMENT_AI_OLLAMA_KEEP_ALIVE ?? "15m",
        format: "json",
        options: buildOllamaOptions(),
        messages: [
          {
            role: "user",
            content: `${input.prompt}\n\nTEXTE OCR:\n${input.text}`
          }
        ]
      }
    });
  }

  private async chat(input: {
    baseUrl: string;
    body: Record<string, unknown>;
  }): Promise<LocalLlmProviderOutput> {
    const timeoutMs = Number.parseInt(process.env.DOCUMENT_AI_TIMEOUT_MS ?? "60000", 10);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${input.baseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input.body),
        signal: controller.signal
      });

      if (!response.ok) {
        const message = await response.text();
        throw new ServiceUnavailableException(
          `Le provider Ollama a echoue (${response.status}). ${message || "Aucune reponse exploitable."}`
        );
      }

      const payload = (await response.json()) as OllamaChatResponse;
      const content = payload.message?.content?.trim();

      if (!content) {
        throw new ServiceUnavailableException("Le provider Ollama a retourne une reponse vide.");
      }

      return {
        model: payload.model,
        content
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(`Provider Ollama indisponible: ${String(error)}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function modelMatches(requestedModel: string, availableModel: string) {
  const normalizedRequested = requestedModel.trim().toLowerCase();
  const normalizedAvailable = availableModel.trim().toLowerCase();

  if (normalizedRequested === normalizedAvailable) {
    return true;
  }

  const requestedWithoutTag = normalizedRequested.split(":")[0];
  const availableWithoutTag = normalizedAvailable.split(":")[0];
  return requestedWithoutTag.length > 0 && requestedWithoutTag === availableWithoutTag;
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function buildOllamaOptions() {
  return {
    temperature: Number.parseFloat(process.env.DOCUMENT_AI_OLLAMA_TEMPERATURE ?? "0"),
    num_predict: Number.parseInt(process.env.DOCUMENT_AI_OLLAMA_NUM_PREDICT ?? "256", 10)
  };
}
