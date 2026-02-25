import React, { useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Layers, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Deck, Flashcard } from '../types';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';

interface FlashcardsProps {
  decks: Deck[];
  onUpdate: (decks: Deck[]) => void;
}

export const Flashcards: React.FC<FlashcardsProps> = ({ decks, onUpdate }) => {
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const activeDeck = decks.find(d => d.id === activeDeckId);

  const createDeck = () => {
    if (!newDeckTitle.trim()) return;
    const newDeck: Deck = {
      id: crypto.randomUUID(),
      title: newDeckTitle,
      cards: [],
    };
    onUpdate([...decks, newDeck]);
    setNewDeckTitle('');
    setIsCreating(false);
    setActiveDeckId(newDeck.id);
  };

  const addCard = (term: string, definition: string) => {
    if (!activeDeck) return;
    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      term,
      definition,
    };
    const updatedDecks = decks.map(d => 
      d.id === activeDeckId ? { ...d, cards: [...d.cards, newCard] } : d
    );
    onUpdate(updatedDecks);
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
          <h2 className="text-2xl font-semibold text-stone-800">{activeDeck.title}</h2>
          <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">
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
                  <p className="text-2xl font-medium text-stone-800">{currentCard.term}</p>
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
                  <p className="text-xl text-white leading-relaxed">{currentCard.definition}</p>
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
          <div className="mt-12">
            <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-4">Add New Card</h3>
            <AddCardForm onAdd={addCard} />
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
          className="mb-10 p-8 glass-card rounded-[2.5rem]"
        >
          <div className="flex gap-4">
            <input
              autoFocus
              type="text"
              placeholder="Blueprint Title (e.g., Quantum Mechanics)"
              value={newDeckTitle}
              onChange={(e) => setNewDeckTitle(e.target.value)}
              className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-forge-accent/50 text-white font-bold"
            />
            <button
              onClick={createDeck}
              className="px-8 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold uppercase tracking-widest text-xs"
            >
              Create
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-6 py-3 text-stone-500 hover:text-white font-bold uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
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

const AddCardForm: React.FC<{ onAdd: (t: string, d: string) => void }> = ({ onAdd }) => {
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !definition.trim()) return;
    onAdd(term, definition);
    setTerm('');
    setDefinition('');
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
      <button
        type="submit"
        className="w-full py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors font-medium text-sm"
      >
        Add Card
      </button>
    </form>
  );
};
