import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, X } from 'lucide-react';
import { getGlobalAnnouncement } from '../services/dataService';

export const AnnouncementBar: React.FC = () => {
  const [announcement, setAnnouncement] = useState<{ message: string; active: boolean } | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    getGlobalAnnouncement().then(data => {
      if (data && data.active) {
        setAnnouncement(data);
      }
    });
  }, []);

  if (!announcement || !isVisible) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-forge-accent text-forge-dark p-4 rounded-[2rem] flex items-center justify-between gap-4 glass-card mb-8 shadow-2xl"
    >
      <div className="flex items-center gap-3">
        <Megaphone size={20} className="shrink-0" />
        <p className="text-[10px] font-black uppercase tracking-[0.1em]">
          {announcement.message}
        </p>
      </div>
      <button onClick={() => setIsVisible(false)} className="text-forge-dark/60 hover:text-forge-dark">
        <X size={20} />
      </button>
    </motion.div>
  );
};
