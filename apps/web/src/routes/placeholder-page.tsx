import { PageHeader } from '../components/page-header.js';

export function PlaceholderPage({
  description,
  milestone,
  title,
}: Readonly<{ description: string; milestone: string; title: string }>) {
  return (
    <section className="grid max-w-3xl gap-8">
      <PageHeader eyebrow="WorkLedger" title={title} description={description} />
      <div className="wl-panel grid gap-3">
        <h2 className="m-0 text-xl font-bold">Route boundary ready</h2>
        <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
          Authentication, permission gating, navigation, and error handling are active for this
          route. The operational workflow is scheduled for {milestone}.
        </p>
      </div>
    </section>
  );
}
