import { listInvoices, listJournalEntries, listRevenueSchedules } from "@/lib/api-client";

import { RevenueScheduleGenerateForm } from "./revenue-forms";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toFixed(2)}`;
}

export default async function RevenuePage() {
  const [invoices, schedules, journalEntries] = await Promise.all([
    listInvoices(),
    listRevenueSchedules(),
    listJournalEntries()
  ]);

  const recognizedAmount = schedules.reduce((sum, schedule) => sum + schedule.recognizedAmount, 0);
  const deferredAmount = schedules.reduce((sum, schedule) => sum + schedule.deferredAmount, 0);

  return (
    <main className="shell page-grid">
      <section className="hero compact">
        <p className="eyebrow">Revenue recognition</p>
        <h1>Earned revenue schedules</h1>
        <p className="lede">Generate ASC 606-lite schedules from approved invoices and inspect the journal entries that recognize deferred revenue.</p>
      </section>

      <section className="two-column">
        <div className="stacked-forms">
          <RevenueScheduleGenerateForm invoices={invoices} />
          <div className="table-panel">
            <div className="table-header">
              <h2>Summary</h2>
              <span>{schedules.length} schedules</span>
            </div>
            <table>
              <tbody>
                <tr>
                  <th>Recognized</th>
                  <td>{formatMoney(schedules[0]?.currency ?? "USD", recognizedAmount)}</td>
                </tr>
                <tr>
                  <th>Deferred</th>
                  <td>{formatMoney(schedules[0]?.currency ?? "USD", deferredAmount)}</td>
                </tr>
                <tr>
                  <th>Journal entries</th>
                  <td>{journalEntries.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="stacked-forms">
          <section className="table-panel">
            <div className="table-header">
              <h2>Revenue schedules</h2>
              <span>{schedules.length} recent</span>
            </div>
            {schedules.length === 0 ? (
              <p className="empty-state">No revenue schedules generated yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Period</th>
                    <th>Recognized</th>
                    <th>Deferred</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td>{schedule.status}</td>
                      <td>{schedule.recognitionMethod}</td>
                      <td>{formatDate(schedule.periodStart)} - {formatDate(schedule.periodEnd)}</td>
                      <td>{formatMoney(schedule.currency, schedule.recognizedAmount)}</td>
                      <td>{formatMoney(schedule.currency, schedule.deferredAmount)}</td>
                      <td>
                        {schedule.customerName ?? "Unknown customer"}
                        <br />
                        <a href={`/invoices/${schedule.invoiceId}`}>Invoice</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="table-panel">
            <div className="table-header">
              <h2>Journal entries</h2>
              <span>{journalEntries.length} recent</span>
            </div>
            {journalEntries.length === 0 ? (
              <p className="empty-state">No journal entries generated yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {journalEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.status}</td>
                      <td>{formatDate(entry.entryDate)}</td>
                      <td>{entry.debitAccount}</td>
                      <td>{entry.creditAccount}</td>
                      <td>{formatMoney(entry.currency, entry.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}