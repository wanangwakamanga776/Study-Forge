import { BookOpen, Brain, Flame, Home, Menu, PanelLeftClose, PanelLeftOpen, Settings, Sparkles, Trophy, UserRound, X } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { cn } from '../../lib/utils';
import { PyraMascot } from '../PyraMascot';

export type AppRoute = 'home' | 'learn' | 'review' | 'progress' | 'profile';

const primaryNav = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'learn' as const, label: 'Learn', icon: BookOpen },
  { id: 'review' as const, label: 'Review', icon: Brain },
  { id: 'progress' as const, label: 'Progress', icon: Trophy },
  { id: 'profile' as const, label: 'Profile', icon: UserRound },
];

interface AppShellProps {
  route: AppRoute;
  onRouteChange: (route: AppRoute) => void;
  children: ReactNode;
  learnerName?: string;
  streak?: number;
  isAdmin?: boolean;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

export function AppShell({ route, onRouteChange, children, learnerName = 'Student', streak = 0, isAdmin, onOpenSettings, onLogout }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--sf-bg)] text-[var(--sf-text)]">
      <button
        type="button"
        className="fixed left-4 top-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/60 text-white backdrop-blur lg:hidden"
        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={sidebarOpen}
        aria-controls="study-forge-sidebar"
        onClick={() => setSidebarOpen((open) => !open)}
      >
        {sidebarOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
      </button>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" aria-hidden="true" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        id="study-forge-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-white/10 bg-[#0d0d11]/95 px-4 py-6 backdrop-blur-xl transition-all duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed && 'lg:w-[84px]',
        )}
        aria-label="Primary navigation"
      >
        <div className="mb-8 flex items-center justify-between gap-3 px-2">
          <button
            type="button"
            className="flex min-w-0 items-center gap-3 rounded-xl text-left"
            onClick={() => { onRouteChange('home'); setSidebarOpen(false); }}
            aria-label="Study Forge home"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--sf-orange-500)] text-black shadow-[0_0_28px_var(--sf-orange-glow)]">
              <Flame aria-hidden="true" size={22} />
            </span>
            {!sidebarCollapsed && (
              <span className="min-w-0">
                <span className="block truncate font-semibold tracking-tight">Study Forge</span>
                <span className="block text-xs text-[var(--sf-text-subtle)]">Learn anything, deeply</span>
              </span>
            )}
          </button>

          <button
            type="button"
            className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl text-[var(--sf-text-subtle)] hover:bg-white/10 hover:text-white lg:grid"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="flex-1" aria-label="Main">
          <p className={cn('mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--sf-text-disabled)]', sidebarCollapsed && 'lg:sr-only')}>
            Your study
          </p>
          <div className="space-y-1">
            {primaryNav.map(({ id, label, icon: Icon }) => {
              const selected = route === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    'group flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors',
                    selected
                      ? 'bg-[var(--sf-orange-500)] font-semibold text-black'
                      : 'text-[var(--sf-text-muted)] hover:bg-white/[0.07] hover:text-white',
                    sidebarCollapsed && 'lg:justify-center lg:px-0',
                  )}
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => {
                    onRouteChange(id);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon aria-hidden="true" size={19} />
                  <span className={cn(sidebarCollapsed && 'lg:sr-only')}>{label}</span>
                </button>
              );
            })}
          </div>

          {!sidebarCollapsed && (
            <>
              <p className="mb-3 mt-8 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--sf-text-disabled)]">
                Workspace
              </p>
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-[var(--sf-text-muted)] transition-colors hover:bg-white/[0.07] hover:text-white"
                onClick={() => { onRouteChange('learn'); setSidebarOpen(false); }}
              >
                <Sparkles aria-hidden="true" size={19} />
                <span>Ask the tutor</span>
              </button>
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-[var(--sf-text-muted)] transition-colors hover:bg-white/[0.07] hover:text-white"
                onClick={() => { onRouteChange('profile'); onOpenSettings?.(); setSidebarOpen(false); }}
              >
                <Settings aria-hidden="true" size={19} />
                <span>Settings</span>
              </button>
            </>
          )}
        </nav>

        <div className="mt-4 rounded-2xl border border-[var(--sf-orange-400)]/20 bg-[var(--sf-orange-500)]/[0.08] p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--sf-orange-300)]">
            <Flame aria-hidden="true" size={15} />
            <span className={cn(sidebarCollapsed && 'lg:sr-only')}>{streak} day streak</span>
          </div>
          {!sidebarCollapsed && <p className="mt-1 text-xs leading-5 text-[var(--sf-text-subtle)]">Keep your learning ember alive today.</p>}
        </div>

        {!sidebarCollapsed && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="scale-75 origin-left -ml-2 -my-4"><PyraMascot expression="happy" className="w-14 h-14" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{learnerName}</p>
              <p className="text-[11px] text-[var(--sf-text-subtle)]">{isAdmin ? 'Admin' : 'Learner'}</p>
            </div>
          </div>
        )}
      </aside>

      <main className={cn('min-h-screen transition-[padding] lg:pl-[248px]', sidebarCollapsed && 'lg:pl-[84px]')}>
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between border-b border-white/[0.07] bg-[var(--sf-bg)]/80 px-5 pl-20 backdrop-blur-xl lg:px-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--sf-text-subtle)]">Study Forge</p>
            <p className="text-sm text-[var(--sf-text-muted)]">Your learning workspace</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm sm:flex">
              <Flame className="text-[var(--sf-orange-400)]" aria-hidden="true" size={16} />
              <span>{streak}</span>
              <span className="text-[var(--sf-text-subtle)]">days</span>
            </div>
            <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-[var(--sf-orange-500)] font-semibold text-black" aria-label="Open profile" onClick={() => onRouteChange('profile')}>
              {learnerName.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1440px] px-5 py-8 pb-32 lg:px-10 lg:py-10">{children}</div>
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-white/10 bg-[#121217]/95 p-2 shadow-2xl backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
        {primaryNav.map(({ id, label, icon: Icon }) => {
          const selected = route === id;
          return (
            <button
              key={id}
              type="button"
              className={cn('flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px]', selected ? 'bg-[var(--sf-orange-500)] text-black' : 'text-[var(--sf-text-subtle)]')}
              aria-current={selected ? 'page' : undefined}
              onClick={() => onRouteChange(id)}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
