import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, X, Shield } from 'lucide-react';
import { getGlobalAnnouncement } from '../services/dataService';
import { cn } from '../lib/utils';

export const AnnouncementBar: React.FC = () => {
  const [announcement, setAnnouncement] = useState<{ message: string; active: boolean } | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [quotaLow, setQuotaLow] = useState(false);

  useEffect(() => {
    getGlobalAnnouncement().then(data => {
      if (data && data.active) {
        setAnnouncement(data);
      }
    });

    const handle = (e: any) => setQuotaLow(e.detail.isQuotaLow);
    window.addEventListener('forge_quota_status_changed', handle);
    return () => window.removeEventListener('forge_quota_status_changed', handle);
  }, []);

  if (!announcement && !quotaLow) return null;
  if (!isVisible && !quotaLow) return null;

  return (
    <AnimatePresence>
      {(isVisible || quotaLow) && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={cn(
            'mb-1 flex items-center justify-between gap-3 rounded-[12px] border px-4 py-3',
            quotaLow ? 'border-[var(--sf-danger)]/30 bg-[var(--sf-danger-soft)] text-rose-100' : 'border-[var(--sf-orange-400)]/25 bg-[var(--sf-orange-500)]/[0.08] text-[var(--sf-text)]'
          )}
        >
          <div className="flex items-start gap-2.5">
            {quotaLow ? <Shield size={16} className="mt-0.5 shrink-0" /> : <Megaphone size={16} className="mt-0.5 shrink-0 text-[var(--sf-orange-300)]" />}
            <p className="text-[13px] leading-5">
              {quotaLow ? 'AI usage is high right now. Some effects are reduced to keep the app responsive.' : announcement?.message}
            </p>
          </div>
          {!quotaLow && (
            <button type="button" aria-label="Dismiss announcement" onClick={() => setIsVisible(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--sf-text-subtle)] hover:bg-white/[0.06] hover:text-white">
              <X size={16} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
