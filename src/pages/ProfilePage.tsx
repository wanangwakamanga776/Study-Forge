import { LogOut, Settings, UserRound } from 'lucide-react';
import { PyraMascot } from '../components/PyraMascot';
import { AppState } from '../types';

interface ProfilePageProps {
  state: AppState;
  learnerName: string;
  isGuest: boolean;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export function ProfilePage({ state, learnerName, isGuest, onOpenSettings, onLogout }: ProfilePageProps) {
  const { stats } = state;
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PyraMascot expression="happy" className="w-16 h-16" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-orange-300)]">Profile</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">{learnerName}</h1>
              <p className="mt-2 text-[var(--sf-text-muted)]">{isGuest ? 'Guest mode — sign in to save progress across devices.' : 'Manage your account and study preferences.'}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] border border-white/10 px-4 py-2 text-sm text-[var(--sf-text-muted)]">
            <UserRound aria-hidden="true" size={16} /> Level {stats.level || 1}
          </span>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[var(--sf-surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-text-subtle)]">XP</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.xp || 0}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[var(--sf-surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-text-subtle)]">Streak</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.streak || 0} days</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[var(--sf-surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-text-subtle)]">Embers</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.embers || 0}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6">
        <h2 className="text-lg font-semibold text-white">Account & settings</h2>
        <p className="mt-2 text-sm text-[var(--sf-text-muted)]">Update your profile, preferences, and session options.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--sf-orange-500)] px-5 font-semibold text-black hover:bg-[var(--sf-orange-400)]" onClick={onOpenSettings}>
            <Settings aria-hidden="true" size={17} /> Open settings
          </button>
          <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 text-sm text-white hover:bg-white/[0.07]" onClick={onLogout}>
            <LogOut aria-hidden="true" size={17} /> {isGuest ? 'Exit guest mode' : 'Sign out'}
          </button>
        </div>
      </section>
    </div>
  );
}
