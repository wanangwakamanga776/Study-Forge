import React, { useState, useEffect } from 'react';
import { Search, Filter, BookOpen, User, Plus, Download, Loader2, BookmarkPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Deck, DeckCategory } from '../types';
import { getPublicDecks, cloneDeck } from '../services/dataService';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';

interface CommunityLibraryProps {
  onAddDeck: (deck: Deck) => void;
  onNavigate: (view: string) => void;
}

const CATEGORIES: (DeckCategory | 'All')[] = ['All', 'Educational', 'Personal', 'Work', 'Other'];

export const CommunityLibrary: React.FC<CommunityLibraryProps> = ({ onAddDeck, onNavigate }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DeckCategory | 'All'>('All');
  const [cloningId, setCloningId] = useState<string | null>(null);

  useEffect(() => {
    loadDecks();
  }, [selectedCategory]);

  const loadDecks = async () => {
    setLoading(true);
    try {
      const data = await getPublicDecks(selectedCategory === 'All' ? undefined : selectedCategory);
      setDecks(data);
    } catch (error) {
      console.error("Failed to load community decks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDecks();
  };

  const handleClone = async (deck: Deck) => {
    if (!auth.currentUser) return;
    setCloningId(deck.id);
    soundService.playClick();
    
    try {
      const cloned = await cloneDeck(auth.currentUser.uid, deck);
      if (cloned) {
        onAddDeck(cloned);
        soundService.playSuccess();
      }
    } catch (error) {
      console.error("Failed to clone deck:", error);
    } finally {
      setCloningId(null);
    }
  };

  const filteredDecks = decks.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter text-white">Community Library</h2>
          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-1">Discover Shared Wisdom</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative group">
          <input 
            type="text"
            placeholder="Search curricula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white placeholder:text-stone-700 outline-none focus:border-white/20 transition-all group-hover:bg-white/10"
          />
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-700 group-hover:text-stone-500 transition-colors" />
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        {/* Sidebar Filters */}
        <div className="space-y-6">
          <div className="glass-card rounded-[2rem] p-6 border border-white/5">
            <div className="flex items-center gap-2 mb-6">
              <Filter size={16} className="text-stone-500" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-500">Categories</h3>
            </div>
            <div className="space-y-2">
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                    selectedCategory === category 
                      ? "bg-white/10 text-white shadow-lg border border-white/10" 
                      : "text-stone-600 hover:text-stone-300 hover:bg-white/5"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-6 glass-card rounded-[2rem] border border-white/5 bg-gradient-to-br from-forge-accent/5 to-transparent">
            <h4 className="text-white font-bold text-sm mb-2">Share Your Own</h4>
            <p className="text-[10px] text-stone-500 leading-relaxed mb-4">Mastered a subject? Publish your deck to help other students across the Academy.</p>
            <button 
              onClick={() => onNavigate('flashcards')}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
            >
              My Decks
            </button>
          </div>
        </div>

        {/* Deck Grid */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-stone-700 gap-4">
              <Loader2 size={40} className="animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">Synchronizing Archives...</p>
            </div>
          ) : filteredDecks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredDecks.map((deck) => (
                  <motion.div
                    key={deck.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="glass-card rounded-[2rem] border border-white/5 overflow-hidden flex flex-col group cursor-pointer"
                  >
                    <div className="p-6 flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="px-2 py-1 bg-white/5 text-stone-500 rounded text-[8px] font-black uppercase tracking-widest border border-white/5">
                          {deck.category || 'Curriculum'}
                        </div>
                        <div className="flex items-center gap-1 text-[8px] font-black uppercase text-stone-700">
                          <BookOpen size={10} />
                          {deck.cards.length} CARDS
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-display font-black uppercase italic tracking-tighter text-white group-hover:text-forge-accent transition-colors">
                        {deck.title}
                      </h3>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-stone-800 flex items-center justify-center">
                          <User size={10} className="text-stone-600" />
                        </div>
                        <span className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">{deck.creatorName || 'Legacy Scholar'}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleClone(deck)}
                      disabled={cloningId === deck.id}
                      className={cn(
                        "w-full py-4 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all",
                        cloningId === deck.id 
                          ? "bg-white/5 text-stone-700" 
                          : "bg-white/5 hover:bg-white/10 text-white border-t border-white/5"
                      )}
                    >
                      {cloningId === deck.id ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Acquiring...
                        </>
                      ) : (
                        <>
                          <BookmarkPlus size={14} />
                          Add to Library
                        </>
                      )}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-32 glass-card rounded-[3rem] border border-white/5">
              <BookOpen size={48} className="mx-auto text-stone-800 mb-6" />
              <p className="text-white font-display font-black uppercase italic tracking-tighter text-2xl">No Results Found</p>
              <p className="text-stone-600 text-[10px] font-bold uppercase tracking-widest mt-2 px-12">
                The archives are silent. Try another search or filter.
              </p>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                }}
                className="mt-8 px-8 py-3 bg-white/5 text-stone-400 rounded-xl font-black uppercase text-[10px] hover:text-white transition-all border border-white/5"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
