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
            "p-4 rounded-[2rem] flex items-center justify-between gap-4 glass-card mb-8 shadow-2xl",
            quotaLow ? "bg-red-500 text-white" : "bg-forge-accent text-forge-dark"
          )}
        >
          <div className="flex items-center gap-3">
            {quotaLow ? <Shield size={20} className="shrink-0" /> : <Megaphone size={20} className="shrink-0" />}
            <p className="text-[10px] font-black uppercase tracking-[0.1em]">
              {quotaLow ? "FORGE CORES OVERHEATED: Aggressive AI Quota Management active. Visuals reduced." : announcement?.message}
            </p>
          </div>
          {!quotaLow && (
            <button onClick={() => setIsVisible(false)} className="text-forge-dark/60 hover:text-forge-dark">
              <X size={20} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
