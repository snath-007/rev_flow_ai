import { loadEnv } from "./config/env.js";

loadEnv();

import { queueNames } from "@revflow/queues";

import { createUsageAggregatorWorker } from "./consumers/usage-aggregator.js";

const workers = [createUsageAggregatorWorker()];

console.log("RevFlow worker starting");
console.log(`Active queues: ${queueNames.usageAggregation}`);
console.log(`Planned queues: ${queueNames.invoiceGeneration}, ${queueNames.revenueRecognition}`);

for (const worker of workers) {
  worker.on("completed", (job) => {
    console.log(`Job completed: ${job.queueName}/${job.name}/${job.id}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Job failed: ${job?.queueName}/${job?.name}/${job?.id}`, error);
  });
}

async function shutdown(signal: NodeJS.Signals) {
  console.log(`Received ${signal}; closing workers`);
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
