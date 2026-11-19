import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <span aria-hidden="true" className="mb-3 block h-[3px] w-9 rounded-full bg-[var(--sf-orange-500)]" />
        <h2 className="sf-page-title text-balance">{title}</h2>
        {description && <p className="sf-subtitle mt-2.5">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{action}</div>}
    </header>
  );
}
