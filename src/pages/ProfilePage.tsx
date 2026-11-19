import { Flame, LogOut, Settings, UserRound } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { FeedbackSection } from '../components/FeedbackSystem';
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
      <PageHeader
        title={learnerName}
        description={isGuest ? 'Guest mode. Sign in to keep your progress across devices.' : 'Your account, preferences, and study settings.'}
        action={
          <span className="sf-chip px-3 py-1.5 text-[13px]">
            <UserRound aria-hidden="true" size={14} /> Level {stats.level || 1}
          </span>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'XP', value: stats.xp || 0 },
          { label: 'Streak', value: `${stats.streak || 0} days` },
          { label: 'Embers', value: stats.embers || 0 },
        ].map(({ label, value }) => (
          <div key={label} className="sf-card p-4 sm:p-5">
            <p className="sf-eyebrow">{label}</p>
            <p className="sf-stat-value mt-2.5 text-[22px] sm:text-[26px]">{value}</p>
          </div>
        ))}
      </div>

      <section className="sf-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="sf-card-title">Account &amp; settings</h2>
            <p className="mt-1 text-[13px] text-[var(--sf-text-muted)]">Update your profile, preferences, and session options.</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--sf-orange-500)]/12 text-[var(--sf-orange-300)]"><Flame size={16} aria-hidden="true" /></span>
        </div>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <button type="button" className="sf-btn sf-btn-primary" onClick={onOpenSettings}>
            <Settings aria-hidden="true" size={16} /> Open settings
          </button>
          <button type="button" className="sf-btn sf-btn-secondary" onClick={onLogout}>
            <LogOut aria-hidden="true" size={16} /> {isGuest ? 'Exit guest mode' : 'Sign out'}
          </button>
        </div>
      </section>

      <FeedbackSection />
    </div>
  );
}
