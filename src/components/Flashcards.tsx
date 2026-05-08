import React, { useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Layers, RotateCw, Globe, Lock, Check, Edit2, Save, X as CloseIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Deck, Flashcard, DeckCategory } from '../types';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';
import { publishDeck } from '../services/dataService';

import { useForgeStore } from '../contexts/ForgeStoreContext';

interface FlashcardsProps {
  decks: Deck[];
  onUpdate: (decks: Deck[]) => void;
}

const CATEGORIES: DeckCategory[] = ['Educational', 'Personal', 'Work', 'Other'];

export const Flashcards: React.FC<FlashcardsProps> = ({ decks, onUpdate }) => {
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [category, setCategory] = useState<DeckCategory>('Educational');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const { trackQuestProgress } = useForgeStore();

  const activeDeck = decks.find(d => d.id === activeDeckId);

  const createDeck = async () => {
    if (!newDeckTitle.trim()) return;
    const newDeck: Deck = {
      id: crypto.randomUUID(),
      title: newDeckTitle,
      cards: [],
      isPublic,
      category,
      createdAt: Date.now()
    };

    if (isPublic) {
      await publishDeck(newDeck);
    }

    onUpdate([...decks, newDeck]);
    setNewDeckTitle('');
    setIsPublic(false);
    setIsCreating(false);
    setActiveDeckId(newDeck.id);
  };

  const addCard = async (term: string, definition: string, imagePrompt?: string) => {
    if (!activeDeck) return;
    
    let imageUrl: string | undefined;
    if (imagePrompt?.trim()) {
      const { generateImage } = await import('../services/aiService');
      imageUrl = await generateImage(imagePrompt) || undefined;
    }

    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      term,
      definition,
      imagePrompt: imagePrompt || undefined,
      imageUrl
    };
    const updatedDecks = decks.map(d => 
      d.id === activeDeckId ? { ...d, cards: [...d.cards, newCard] } : d
    );
    onUpdate(updatedDecks);
    soundService.playSuccess();
  };

  const updateCard = (cardId: string, term: string, definition: string, imagePrompt?: string, imageUrl?: string) => {
    if (!activeDeck) return;
    const updatedDecks = decks.map(d => 
      d.id === activeDeckId ? {
        ...d,
        cards: d.cards.map(c => c.id === cardId ? { ...c, term, definition, imagePrompt, imageUrl: imageUrl ?? c.imageUrl } : c)
      } : d
    );
    onUpdate(updatedDecks);
  };

  const regenerateCardImage = async (cardId: string) => {
    if (!activeDeck) return;
    const card = activeDeck.cards.find(c => c.id === cardId);
    if (!card || !card.imagePrompt) return;

    const { generateImage } = await import('../services/aiService');
    const imageUrl = await generateImage(card.imagePrompt);
    
    if (imageUrl) {
      updateCard(cardId, card.term, card.definition, card.imagePrompt, imageUrl);
      soundService.playSuccess();
    }
  };

  const removeCard = (cardId: string) => {
    if (!activeDeck) return;
    const updatedDecks = decks.map(d => 
      d.id === activeDeckId ? {
        ...d,
        cards: d.cards.filter(c => c.id !== cardId)
      } : d
    );
    if (activeDeck.cards.length <= 1) {
      setCurrentCardIndex(0);
    } else if (currentCardIndex >= activeDeck.cards.length - 1) {
      setCurrentCardIndex(prev => Math.max(0, prev - 1));
    }
    onUpdate(updatedDecks);
  };

  const saveTitle = () => {
    if (!activeDeck || !editingTitle.trim()) return;
    const updatedDecks = decks.map(d => 
      d.id === activeDeckId ? { ...d, title: editingTitle } : d
    );
    onUpdate(updatedDecks);
    setIsEditingTitle(false);
    soundService.playSuccess();
  };

  const deleteDeck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(decks.filter(d => d.id !== id));
    if (activeDeckId === id) setActiveDeckId(null);
  };

  if (activeDeck) {
    const cards = activeDeck.cards;
    const currentCard = cards[currentCardIndex];

    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setActiveDeckId(null)}
          className="mb-6 flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors text-sm font-medium"
        >
          <ChevronLeft size={18} />
          Back to Decks
        </button>

        <div className="flex items-center justify-between mb-8">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1 mr-4">
              <input
                autoFocus
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xl font-semibold text-white focus:outline-none focus:ring-2 focus:ring-forge-accent/50"
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
              />
              <button 
                onClick={saveTitle}
                className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
              >
                <Check size={20} />
              </button>
              <button 
                onClick={() => setIsEditingTitle(false)}
                className="p-2 text-stone-500 hover:bg-white/5 rounded-lg transition-colors"
              >
                <CloseIcon size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-stone-800">{activeDeck.title}</h2>
              <button
                onClick={() => {
                  setEditingTitle(activeDeck.title);
                  setIsEditingTitle(true);
                }}
                className="p-1 text-stone-400 hover:text-forge-accent transition-colors"
              >
                <Edit2 size={16} />
              </button>
            </div>
          )}
          <span className="text-xs font-medium text-stone-400 uppercase tracking-widest whitespace-nowrap">
            {cards.length > 0 ? `${currentCardIndex + 1} / ${cards.length}` : 'No cards'}
          </span>
        </div>

        {cards.length > 0 ? (
          <div className="flex flex-col items-center gap-8">
            <div 
              className="relative w-full h-80 perspective-1000 cursor-pointer"
              onClick={() => {
                setIsFlipped(!isFlipped);
                soundService.playClick();
                if (!isFlipped) {
                  trackQuestProgress('card_flip', 1);
                }
              }}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-full h-full relative preserve-3d"
              >
                {/* Front */}
                <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-black/5 shadow-sm text-center">
                  <span className="text-xs font-bold text-stone-300 uppercase tracking-widest mb-4">Term</span>
                  
                  {currentCard.imageUrl && (
                    <div className="w-full h-32 mb-6 overflow-hidden rounded-2xl border border-black/5 group-hover:scale-105 transition-transform duration-500">
                      <img 
                        src={currentCard.imageUrl} 
                        alt={currentCard.term} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div className="text-2xl font-medium text-stone-800 markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentCard.term}</ReactMarkdown>
                  </div>
                  <div className="absolute bottom-6 flex items-center gap-2 text-stone-300 text-xs">
                    <RotateCw size={14} />
                    Click to flip
                  </div>
                </div>
                {/* Back */}
                <div 
                  className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-12 bg-stone-900 rounded-3xl border border-black/5 shadow-sm text-center rotate-y-180"
                >
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Definition</span>
                  <div className="text-xl text-white leading-relaxed markdown-content prose prose-invert mb-4">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentCard.definition}</ReactMarkdown>
                  </div>
                  {currentCard.explanation && (
                    <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5 text-xs text-stone-400 text-left w-full">
                      <p className="font-bold text-forge-accent uppercase tracking-widest text-[8px] mb-1">Rationale (The Why)</p>
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentCard.explanation}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            <div className="flex items-center gap-6">
              <button
                disabled={currentCardIndex === 0}
                onClick={() => {
                  setCurrentCardIndex(prev => prev - 1);
                  setIsFlipped(false);
                  soundService.playClick();
                }}
                className="p-4 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                disabled={currentCardIndex === cards.length - 1}
                onClick={() => {
                  setCurrentCardIndex(prev => prev + 1);
                  setIsFlipped(false);
                  soundService.playClick();
                }}
                className="p-4 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
            <p className="text-stone-400 mb-6">This deck is empty.</p>
            <AddCardForm onAdd={addCard} />
          </div>
        )}

        {cards.length > 0 && (
          <div className="mt-12 space-y-12">
            <div>
               <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-4">Manage Blueprints</h3>
               <div className="space-y-3">
                 {cards.map((card, i) => (
                   <div key={card.id} className="group p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-4">
                     <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <input
                            type="text"
                            value={card.term}
                            onChange={(e) => updateCard(card.id, e.target.value, card.definition, card.imagePrompt)}
                            className="bg-transparent text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-forge-accent/30 rounded px-1"
                          />
                          <input
                            type="text"
                            value={card.definition}
                            onChange={(e) => updateCard(card.id, card.term, e.target.value, card.imagePrompt)}
                            className="bg-transparent text-sm text-stone-400 focus:outline-none focus:ring-1 focus:ring-forge-accent/30 rounded px-1"
                          />
                        </div>
                        <button
                          onClick={() => removeCard(card.id)}
                          className="p-2 text-stone-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                     <div className="flex items-center gap-2">
                        <Sparkles size={12} className="text-forge-accent shrink-0" />
                        <input
                          type="text"
                          placeholder="Image Prompt (Empty for no image)"
                          value={card.imagePrompt || ''}
                          onChange={(e) => updateCard(card.id, card.term, card.definition, e.target.value)}
                          className="flex-1 bg-transparent text-[10px] text-stone-500 font-medium placeholder:text-stone-700 focus:outline-none focus:ring-1 focus:ring-forge-accent/20 rounded px-1"
                        />
                        <button
                          onClick={() => regenerateCardImage(card.id)}
                          disabled={!card.imagePrompt}
                          className="p-1 hover:text-forge-accent transition-colors disabled:opacity-30"
                          title="Generate/Refresh Image"
                        >
                          <RotateCw size={10} />
                        </button>
                        {card.imageUrl && <Check size={10} className="text-emerald-500" />}
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-4">Add New Card</h3>
              <AddCardForm onAdd={addCard} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-3xl font-extrabold font-display uppercase italic tracking-tighter text-white">Flashcard Blueprints</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-6 py-3 forge-gradient text-forge-dark rounded-xl hover:scale-105 transition-all font-display font-extrabold uppercase italic tracking-tighter forge-glow"
        >
          <Plus size={20} />
          New Deck
        </button>
      </div>

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 p-8 glass-card rounded-[2.5rem] space-y-6"
        >
          <div className="flex gap-4">
            <input
              autoFocus
              type="text"
              placeholder="Blueprint Title (e.g., Quantum Mechanics)"
              value={newDeckTitle}
              onChange={(e) => setNewDeckTitle(e.target.value)}
              className="flex-1 px-6 py-4 rounded-xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-forge-accent/50 text-white font-bold outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-stone-600 block">Category</label>
                 <div className="flex gap-2">
                   {CATEGORIES.map(cat => (
                     <button
                       key={cat}
                       onClick={() => setCategory(cat)}
                       className={cn(
                         "px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                         category === cat ? "bg-forge-accent text-forge-dark" : "bg-white/5 text-stone-500 hover:bg-white/10"
                       )}
                     >
                       {cat}
                     </button>
                   ))}
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-stone-600 block">Visibility</label>
                 <button
                    onClick={() => setIsPublic(!isPublic)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all",
                      isPublic 
                        ? "bg-forge-accent/10 border-forge-accent text-forge-accent" 
                        : "bg-white/5 border-white/10 text-stone-500"
                    )}
                 >
                   {isPublic ? <Globe size={14} /> : <Lock size={14} />}
                   <span className="text-[10px] font-bold uppercase tracking-widest">{isPublic ? 'Public' : 'Private'}</span>
                   {isPublic && <Check size={12} />}
                 </button>
               </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsCreating(false)}
                className="px-6 py-3 text-stone-600 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createDeck}
                className="px-8 py-3 bg-white text-forge-dark rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                Create Deck
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {decks.map((deck) => (
          <motion.div
            key={deck.id}
            whileHover={{ y: -8, scale: 1.02 }}
            onClick={() => setActiveDeckId(deck.id)}
            className="group cursor-pointer p-8 glass-card rounded-[2rem] hover:border-forge-accent/50 transition-all"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="p-4 bg-forge-accent/10 text-forge-accent rounded-2xl forge-glow">
                <Layers size={28} />
              </div>
              <button
                onClick={(e) => deleteDeck(deck.id, e)}
                className="opacity-0 group-hover:opacity-100 p-2 text-stone-600 hover:text-red-500 transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{deck.title}</h3>
            <p className="text-xs font-bold text-stone-600 uppercase tracking-widest">{deck.cards.length} Blueprints</p>
          </motion.div>
        ))}
      </div>

      {decks.length === 0 && !isCreating && (
        <div className="text-center py-20 text-stone-400">
          <p>No decks yet. Create one to start studying!</p>
        </div>
      )}
    </div>
  );
};

const AddCardForm: React.FC<{ onAdd: (t: string, d: string, p?: string) => void }> = ({ onAdd }) => {
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !definition.trim()) return;
    onAdd(term, definition, imagePrompt || undefined);
    setTerm('');
    setDefinition('');
    setImagePrompt('');
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Term"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-stone-200 text-sm"
        />
        <input
          type="text"
          placeholder="Definition"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          className="px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-stone-200 text-sm"
        />
      </div>
      <div className="relative group/input">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
          <Sparkles size={14} />
        </div>
        <input
          type="text"
          placeholder="Optional: Visual Image Prompt (e.g., A vintage diagram of a steam engine)"
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          className="w-full px-10 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-forge-accent/20 text-xs text-stone-600 placeholder:text-stone-300 transition-all shadow-inner"
        />
      </div>
      <button
        type="submit"
        className="w-full py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 hover:scale-[1.01] active:scale-[0.99] transition-all font-display font-black uppercase italic tracking-tighter text-sm"
      >
        Add Blueprint Card
      </button>
    </form>
  );
};
