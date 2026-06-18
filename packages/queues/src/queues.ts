import { Queue, type ConnectionOptions, type JobsOptions } from "bullmq";

import { getRedisConnectionOptions } from "./connection.js";
import type { UsageAggregationJob } from "./jobs.js";
import { queueNames } from "./queue-names.js";

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1000
  },
  removeOnComplete: 100,
  removeOnFail: 500
};

export function createUsageAggregationQueue(connection: ConnectionOptions = getRedisConnectionOptions()) {
  return new Queue<UsageAggregationJob, void, "usage.aggregate">(queueNames.usageAggregation, {
    connection,
    defaultJobOptions
  });
}

export async function enqueueUsageAggregationJob(
  data: UsageAggregationJob,
  options: { connection?: ConnectionOptions; jobId?: string } = {}
) {
  const queue = createUsageAggregationQueue(options.connection);

  try {
    return await queue.add("usage.aggregate", data, {
      jobId: options.jobId ?? `usage.aggregate:${data.contractId}:${data.meterId}:${data.periodStart}:${data.periodEnd}`
    });
  } finally {
    await queue.close();
  }
}
