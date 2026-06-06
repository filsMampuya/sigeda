declare module "busboy" {
  import type { Readable } from "node:stream";

  export type FileInfo = {
    filename: string;
    encoding: string;
    mimeType: string;
  };

  export type BusboyConfig = {
    headers: Record<string, string | string[] | undefined>;
    limits?: {
      fileSize?: number;
    };
  };

  export default function Busboy(config: BusboyConfig): {
    on(event: "file", listener: (name: string, file: Readable, info: FileInfo) => void): void;
    on(event: "error", listener: (error: Error) => void): void;
    on(event: "finish", listener: () => void): void;
    end(buffer: Buffer): void;
  };
}
