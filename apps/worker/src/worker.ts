import { loadEnv } from "./config/env.js";

loadEnv();

import { queueNames } from "@revflow/queues";

console.log("RevFlow worker scaffold starting");
console.log(`Planned queues: ${Object.values(queueNames).join(", ")}`);

