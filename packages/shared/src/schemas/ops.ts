import { z } from "zod";

export const jobRunStatusSchema = z.enum(["running", "succeeded", "failed"]);

export const jobRunSchema = z.object({
  id: z.string().uuid(),
  queueName: z.string(),
  jobName: z.string(),
  jobId: z.string().nullable(),
  status: jobRunStatusSchema,
  payload: z.unknown(),
  result: z.unknown().nullable(),
  errorMessage: z.string().nullable(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type JobRun = z.infer<typeof jobRunSchema>;
export type JobRunStatus = z.infer<typeof jobRunStatusSchema>;
