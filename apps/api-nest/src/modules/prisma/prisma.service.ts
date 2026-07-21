import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@sigeda/database";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const maxAttempts = Number.parseInt(process.env.PRISMA_CONNECT_RETRIES ?? "12", 10);
    const retryDelayMs = Number.parseInt(process.env.PRISMA_CONNECT_DELAY_MS ?? "5000", 10);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.$connect();

        if (attempt > 1) {
          this.logger.log(`Connexion Prisma etablie apres ${attempt} tentative(s).`);
        }

        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (attempt >= maxAttempts) {
          this.logger.error(
            `Connexion Prisma impossible apres ${maxAttempts} tentative(s): ${message}`
          );
          throw error;
        }

        this.logger.warn(
          `Echec de connexion Prisma (tentative ${attempt}/${maxAttempts}). Nouvelle tentative dans ${retryDelayMs} ms. Cause: ${message}`
        );
        await sleep(retryDelayMs);
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

function sleep(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
