import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  imageUrl?: string;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, title, description, imageUrl }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-forge-dark border border-white/10 rounded-[2rem] p-8 max-w-lg w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-white uppercase italic mb-4">{title}</h3>
            {imageUrl && (
              <img src={imageUrl} alt={title} className="w-full h-48 object-cover rounded-xl mb-6" />
            )}
            <p className="text-white/70 font-medium leading-relaxed">{description}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
