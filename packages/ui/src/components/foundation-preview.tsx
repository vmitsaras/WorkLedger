import { Button } from './button.js';
import { Dialog } from './dialog.js';
import { Link } from './link.js';
import { TextField } from './text-field.js';

export function FoundationPreview() {
  return (
    <section aria-labelledby="foundation-preview-title" className="grid gap-8">
      <header className="grid max-w-2xl gap-3">
        <p className="m-0 text-sm font-bold uppercase tracking-[0.12em] text-[var(--wl-text-muted)]">
          UI foundation
        </p>
        <h1
          id="foundation-preview-title"
          className="m-0 text-3xl font-bold tracking-[-0.025em] text-[var(--wl-text)]"
        >
          Calm, clear controls for everyday work
        </h1>
        <p className="m-0 max-w-prose text-base leading-7 text-[var(--wl-text-muted)]">
          These product-neutral examples establish semantics, focus, field relationships, and dialog
          behavior before feature routes are built.
        </p>
      </header>

      <div className="grid gap-6 rounded-2xl border border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-6 shadow-[var(--wl-shadow-card)]">
        <div className="flex flex-wrap items-center gap-3">
          <Button onPress={() => undefined}>Save preference</Button>
          <Link href="#field-example">Review field guidance</Link>
          <Dialog triggerLabel="Open dialog" title="Review before continuing">
            This modal example keeps its title and explanation persistent, closes with Escape, and
            restores focus to the trigger.
          </Dialog>
        </div>

        <div id="field-example" className="max-w-md">
          <TextField
            label="Display name"
            description="Used only to demonstrate a visible label and connected description."
            placeholder="Alex Morgan"
          />
        </div>
      </div>
    </section>
  );
}
