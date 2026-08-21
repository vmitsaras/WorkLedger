import { PageHeader } from '../components/page-header.js';

/**
 * System audit page — placeholder.
 * Full implementation deferred to WL-1007 (technical audit persistence and search).
 *
 * This page will provide security and technical audit search for system administrators,
 * separated from domain audit. It will contain NO domain payloads or notification content.
 */
export function SystemAuditPage() {
  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow="System administration"
        title="Technical audit"
        description="Security and technical audit evidence, separated from domain history. Full search implementation coming in WL-1007."
      />

      <div className="wl-panel">
        <p className="text-[var(--wl-text-muted)]">
          Technical audit persistence and search interface is planned for WL-1007.
        </p>
        <p className="mt-4 text-[var(--wl-text-muted)]">
          This audit stream will record security, authentication, session, and technical operations
          events without domain payloads or HR data.
        </p>
      </div>
    </section>
  );
}
