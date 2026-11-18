import { FileText, Image, Link2, Plus, Search } from 'lucide-react';

export interface SourceItem {
  id: string;
  title: string;
  kind: 'pdf' | 'note' | 'image' | 'link';
  selected?: boolean;
}

interface SourceRailProps {
  sources: SourceItem[];
  onAdd: () => void;
  onSelect: (source: SourceItem) => void;
}

const iconFor = { pdf: FileText, note: FileText, image: Image, link: Link2 } as const;

export function SourceRail({ sources, onAdd, onSelect }: SourceRailProps) {
  return (
    <aside className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-4" aria-label="Workspace sources">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Sources</p>
          <p className="text-xs text-[var(--sf-text-subtle)]">Ground your tutor</p>
        </div>
        <button type="button" className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--sf-orange-500)] text-black hover:bg-[var(--sf-orange-400)]" aria-label="Add source" onClick={onAdd}>
          <Plus aria-hidden="true" size={18} />
        </button>
      </div>
      <label htmlFor="source-search" className="sr-only">Search sources</label>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sf-text-disabled)]" aria-hidden="true" size={16} />
        <input id="source-search" type="search" placeholder="Search sources" className="h-10 w-full rounded-xl border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-white placeholder:text-[var(--sf-text-disabled)] focus:border-[var(--sf-orange-400)] focus:outline-none" />
      </div>
      <div className="mt-4 space-y-1">
        {sources.length === 0 && (
          <p className="px-2 py-3 text-xs text-[var(--sf-text-subtle)]">No sources yet. Add notes or files to ground answers.</p>
        )}
        {sources.map((source) => {
          const Icon = iconFor[source.kind];
          return (
            <button
              key={source.id}
              type="button"
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm ${source.selected ? 'bg-[var(--sf-orange-500)]/15 text-[var(--sf-orange-300)]' : 'text-[var(--sf-text-muted)] hover:bg-white/[0.06] hover:text-white'}`}
              onClick={() => onSelect(source)}
            >
              <Icon aria-hidden="true" size={17} />
              <span className="truncate">{source.title}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
