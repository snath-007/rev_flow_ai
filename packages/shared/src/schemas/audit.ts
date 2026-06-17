import { z } from "zod";

export const auditLogSchema = z.object({
  id: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  action: z.string(),
  beforeState: z.unknown().nullable(),
  afterState: z.unknown().nullable(),
  actor: z.string(),
  createdAt: z.string()
});

export type AuditLog = z.infer<typeof auditLogSchema>;
