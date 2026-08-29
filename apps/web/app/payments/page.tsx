import { WorkspaceShell } from "../workspace-shell";
import { getAuthenticationContext, listInvoices, listPayments } from "@/lib/api-client";
import { hasCapability } from "@/lib/access";
import { NextAction, WorkflowGuide, WorkflowPageHeader } from "../workflow-components";
import { PermissionNotice } from "../permission-notice";
import { PaymentsWorkspace } from "./payments-workspace";

export default async function PaymentsPage() {
  const [context, invoices, payments] = await Promise.all([
    getAuthenticationContext(),
    listInvoices(),
    listPayments()
  ]);

  const canWritePayments = context.status === "ready" && hasCapability(context.actor, "payments.write");
  const payableInvoices = invoices.filter((invoice) => ["approved", "issued"].includes(invoice.status) && invoice.balanceDue > 0);
  const appliedPayments = payments.filter((payment) => payment.allocatedAmount > 0);
  const overpayments = payments.filter((payment) => payment.unappliedAmount > 0);

  return (
    <WorkspaceShell activePath="/payments">
      <main className="workspace-page page-grid">
        <WorkflowPageHeader
          breadcrumbs={[{ href: "/overview", label: "Overview" }, { label: "Payments" }]}
          eyebrow="Operate"
          title="Cash receipt reconciliation"
          description="Record manual receipts, allocate them to invoices, and keep partial and overpayment evidence visible without integrating a payment processor."
        />

        <WorkflowGuide
          title="Payment workflow"
          items={[
            { href: "/invoices", label: "Approved invoice", detail: `${payableInvoices.length} payable`, status: payableInvoices.length > 0 ? "active" : payments.length > 0 ? "done" : "blocked" },
            { label: "Receipt", detail: `${payments.length} recorded`, status: payments.length > 0 ? "done" : payableInvoices.length > 0 ? "active" : "blocked" },
            { label: "Allocation", detail: `${appliedPayments.length} matched`, status: appliedPayments.length > 0 ? "done" : payments.length > 0 ? "active" : "blocked" },
            { label: "Exception", detail: `${overpayments.length} unapplied`, status: overpayments.length > 0 ? "active" : "idle" }
          ]}
        />

        {!canWritePayments ? <PermissionNotice capability="payments.write" label="Payment recording" /> : null}

        <PaymentsWorkspace canWrite={canWritePayments} invoices={invoices} payments={payments} />

        {payments.length > 0 ? <NextAction href="/revenue" title="Next: recognition context">Review revenue schedules after billing and cash receipt evidence are aligned.</NextAction> : null}
      </main>
    </WorkspaceShell>
  );
}