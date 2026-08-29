export function PermissionNotice({ capability, label }: { capability: string; label?: string }) {
  return (
    <section className="table-panel" aria-label={label ?? "Permission required"}>
      <div className="table-header">
        <h2>{label ?? "Read-only access"}</h2>
        <span>Requires {capability}</span>
      </div>
      <p className="empty-state">Your role can view this workspace area, but this action is not available for your current permissions.</p>
    </section>
  );
}
