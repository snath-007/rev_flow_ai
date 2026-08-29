import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";

loadEnv();

const app = createApp();

export default app;
