import * as opsRepository from "./ops.repository.js";

export async function listJobRuns() {
  return opsRepository.listJobRuns();
}
