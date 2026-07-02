import { describe, expect, it } from "vitest";

import { roleCapabilities } from "./auth.js";

describe("role capabilities", () => {
  it("keeps approval capabilities separate from finance operations", () => {
    expect(roleCapabilities.finance_operator).toContain("invoices.generate");
    expect(roleCapabilities.finance_operator).not.toContain("invoices.approve");
    expect(roleCapabilities.reviewer).toContain("invoices.approve");
    expect(roleCapabilities.reviewer).not.toContain("invoices.generate");
  });

  it("keeps auditors read-only", () => {
    expect(roleCapabilities.auditor.every((capability) => capability.endsWith(".read"))).toBe(true);
  });

  it("grants workspace administrators the full capability vocabulary", () => {
    expect(roleCapabilities.workspace_admin).toContain("workspace.manage");
    expect(roleCapabilities.workspace_admin).toContain("ai.apply");
    expect(roleCapabilities.workspace_admin).toContain("payments.write");
  });
});
