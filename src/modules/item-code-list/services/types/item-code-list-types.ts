import { z } from "zod"

export const itemCodeListSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  baseDocumentId: z.string(),
  MAVCode: z.string(),
  MHBCode: z.string(),
  IzuyoshiJPCode: z.string(),
  IzuyoshiVNCode: z.string(),
  Description: z.string(),
  updatedAt: z.union([z.string(), z.number()]).optional(),
})

export type ItemCodeList = z.infer<typeof itemCodeListSchema>
