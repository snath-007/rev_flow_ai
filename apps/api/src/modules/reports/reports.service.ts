import * as reportsRepository from "./reports.repository.js";

export async function getOverviewReport() {
  return reportsRepository.getOverviewReport();
}
export async function getRevenueWaterfallReport() {
  return reportsRepository.getRevenueWaterfallReport();
}
export async function getArAgingReport() {
  return reportsRepository.getArAgingReport();
}

export async function getDsoReport() {
  return reportsRepository.getDsoReport();
}
export async function getRecurringRevenueReport() {
  return reportsRepository.getRecurringRevenueReport();
}