import { BookOpen, Brain, Flame, HelpCircle, Home, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, Settings, Sparkles, Trophy, UserRound, X, Layers, Map, Swords, Wrench } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { cn } from '../../lib/utils';
import { PyraMascot } from '../PyraMascot';

export type AppRoute = 'home' | 'forge' | 'practice' | 'map' | 'progress' | 'profile';

const primaryNav = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'forge' as const, label: 'Forge', icon: Layers },
  { id: 'practice' as const, label: 'Practice', icon: Swords },
  { id: 'map' as const, label: 'Knowledge Map', icon: Map },
  { id: 'progress' as const, label: 'Progress', icon: Trophy },
  { id: 'profile' as const, label: 'Profile', icon: UserRound },
];

const routeMeta: Record<AppRoute, { title: string; description: string }> = {
  home: { title: 'Home', description: 'Your learning command centre.' },
  forge: { title: 'Forge Studio', description: 'Create and manage your learning environments.' },
  practice: { title: 'Practice', description: 'Flashcards, quizzes, and exam simulations.' },
  map: { title: 'Knowledge Map', description: 'See your understanding across subjects and topics.' },
  progress: { title: 'Progress', description: 'Track mastery, XP, streaks, and achievements.' },
  profile: { title: 'Profile', description: 'Account, preferences, and study settings.' },
};

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

export function AppShell({ route, onRouteChange, children, learnerName = 'Student', streak = 0, isAdmin, onOpenSettings }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const meta = routeMeta[route];

  return (
    <div className="min-h-screen bg-[var(--sf-bg)] text-[var(--sf-text)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[var(--sf-orange-500)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
      >
        Skip to content
      </a>

      <button
        type="button"
        className="fixed left-4 top-3.5 z-50 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--sf-border)] bg-[var(--sf-surface)]/95 text-[var(--sf-text)] backdrop-blur lg:hidden"
        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={sidebarOpen}
        aria-controls="study-forge-sidebar"
        onClick={() => setSidebarOpen((open) => !open)}
      >
        {sidebarOpen ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
      </button>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] lg:hidden" aria-hidden="true" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        id="study-forge-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-[var(--sf-border)] bg-[#0d0c0b]/95 px-3.5 py-5 backdrop-blur-xl transition-[width,transform] duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed && 'lg:w-[80px]',
        )}
        aria-label="Primary navigation"
      >
        <div className="mb-7 flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            className="flex min-w-0 items-center gap-2.5 rounded-lg text-left"
            onClick={() => { onRouteChange('home'); setSidebarOpen(false); }}
            aria-label="Study Forge home"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--sf-orange-500)] text-[#1a1209]">
              <Flame aria-hidden="true" size={18} />
            </span>
            {!sidebarCollapsed && (
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold tracking-tight">Study Forge</span>
                <span className="block text-[11px] text-[var(--sf-text-subtle)]">Learn anything, deeply</span>
              </span>
            )}
          </button>

          <button
            type="button"
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--sf-text-subtle)] hover:bg-white/[0.06] hover:text-white lg:grid"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        <nav className="flex-1" aria-label="Main">
          <p className={cn('mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--sf-text-disabled)]', sidebarCollapsed && 'lg:sr-only')}>
            Study
          </p>
          <div className="space-y-0.5">
            {primaryNav.map(({ id, label, icon: Icon }) => {
              const selected = route === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    'group relative flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm transition-colors',
                    selected
                      ? 'bg-white/[0.07] font-semibold text-white'
                      : 'font-medium text-[var(--sf-text-muted)] hover:bg-white/[0.04] hover:text-white',
                    sidebarCollapsed && 'lg:justify-center lg:px-0',
                  )}
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => {
                    onRouteChange(id);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon aria-hidden="true" size={18} className={selected ? 'text-[var(--sf-orange-400)]' : 'text-[var(--sf-text-subtle)] group-hover:text-[var(--sf-text-muted)]'} />
                  <span className={cn('truncate', sidebarCollapsed && 'lg:sr-only')}>{label}</span>
                  {selected && <span aria-hidden="true" className={cn('absolute left-0 top-2 h-7 w-[3px] rounded-r-full bg-[var(--sf-orange-500)]', sidebarCollapsed && 'lg:hidden')} />}
                </button>
              );
            })}
          </div>

          {!sidebarCollapsed && (
            <>
              <p className="mb-2 mt-7 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--sf-text-disabled)]">
                Workspace
              </p>
              <div className="space-y-0.5">
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-medium text-[var(--sf-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-white"
                  onClick={() => { onRouteChange('forge'); setSidebarOpen(false); }}
                >
                  <Sparkles aria-hidden="true" size={18} className="text-[var(--sf-text-subtle)]" />
                  <span>Ask the tutor</span>
                </button>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-medium text-[var(--sf-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-white"
                  onClick={() => { onRouteChange('profile'); onOpenSettings?.(); setSidebarOpen(false); }}
                >
                  <Settings aria-hidden="true" size={18} className="text-[var(--sf-text-subtle)]" />
                  <span>Settings</span>
                </button>
              </div>
            </>
          )}
        </nav>

        <div className={cn('mt-4', sidebarCollapsed && 'lg:mt-4')}>
          <button
            type="button"
            className={cn(
              'mb-2 flex min-h-10 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[12.5px] font-medium text-[var(--sf-text-subtle)] transition-colors hover:bg-white/[0.04] hover:text-white',
              sidebarCollapsed && 'lg:justify-center lg:px-0',
            )}
            onClick={() => { window.dispatchEvent(new Event('studyforge:open-mission')); setSidebarOpen(false); }}
          >
            <HelpCircle aria-hidden="true" size={16} />
            <span className={cn(sidebarCollapsed && 'lg:sr-only')}>The Mission</span>
          </button>
        </div>

        <div className={cn('rounded-[12px] border border-[var(--sf-border)] bg-white/[0.025] p-3', sidebarCollapsed && 'lg:px-2')}>
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--sf-orange-300)]">
            <Flame aria-hidden="true" size={15} />
            <span className={cn(sidebarCollapsed && 'lg:sr-only')}>{streak} day streak</span>
          </div>
          {!sidebarCollapsed && <p className="mt-1 text-[11.5px] leading-5 text-[var(--sf-text-subtle)]">A few focused minutes keeps it alive.</p>}
        </div>

        {!sidebarCollapsed && (
          <div className="mt-3 flex items-center gap-3 rounded-[12px] border border-[var(--sf-border)] bg-white/[0.025] p-3">
            <div className="shrink-0"><PyraMascot expression="happy" className="h-9 w-9" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{learnerName}</p>
              <p className="text-[11px] text-[var(--sf-text-subtle)]">{isAdmin ? 'Admin' : 'Learner'}</p>
            </div>
          </div>
        )}
      </aside>

      <main className={cn('min-h-screen transition-[padding] lg:pl-[248px]', sidebarCollapsed && 'lg:pl-[80px]')}>
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center justify-between gap-4 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/85 px-4 pl-[68px] backdrop-blur-xl sm:px-6 sm:pl-[68px] lg:px-10 lg:pl-10">
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-white">{meta.title}</h1>
            <p className="hidden truncate text-xs text-[var(--sf-text-subtle)] sm:block">{meta.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="sf-icon-btn h-9 w-9 border-transparent bg-white/[0.04]"
              aria-label="Open the AI assistant"
              onClick={() => window.dispatchEvent(new Event('studyforge:open-chat'))}
            >
              <MessageSquare aria-hidden="true" size={16} />
            </button>
            <div className="hidden items-center gap-2 rounded-full border border-[var(--sf-border)] bg-white/[0.03] px-3 py-1.5 text-xs text-[var(--sf-text-muted)] sm:flex">
              <Flame className="text-[var(--sf-orange-400)]" aria-hidden="true" size={14} />
              <span className="font-semibold text-white">{streak}</span>
              <span>day{streak === 1 ? '' : 's'}</span>
            </div>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full bg-[var(--sf-orange-500)] text-sm font-semibold text-[#1a1209]"
              aria-label="Open profile"
              onClick={() => onRouteChange('profile')}
            >
              {learnerName.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        <div id="main-content" className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pb-16 lg:pt-10">{children}</div>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--sf-border)] bg-[#0d0c0b]/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-5">
          {primaryNav.map(({ id, label, icon: Icon }) => {
            const selected = route === id;
            return (
              <button
                key={id}
                type="button"
                className={cn(
                  'relative flex min-h-[58px] flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors',
                  selected ? 'text-white' : 'text-[var(--sf-text-subtle)] hover:text-[var(--sf-text-muted)]',
                )}
                aria-current={selected ? 'page' : undefined}
                onClick={() => onRouteChange(id)}
              >
                {selected && <span aria-hidden="true" className="absolute top-0 h-[2px] w-8 rounded-b-full bg-[var(--sf-orange-500)]" />}
                <Icon aria-hidden="true" size={19} className={selected ? 'text-[var(--sf-orange-400)]' : undefined} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
