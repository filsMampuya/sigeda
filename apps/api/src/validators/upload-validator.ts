import { z } from "zod";

export const uploadDocumentParamsSchema = z.object({
  id: z.string().min(1)
});
