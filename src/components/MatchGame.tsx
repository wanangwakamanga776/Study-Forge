import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, RotateCcw, ArrowLeft, Zap, CheckCircle2, AlertCircle, Flame, Star } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Deck, Flashcard } from '../types';
import { cn } from '../lib/utils';
import { useForgeEngine } from '../hooks/useForgeEngine';
import { useRewards } from './RewardToast';

interface MatchTile {
  id: string;
  text: string;
  pairId: string;
  type: 'term' | 'definition';
  isMatched: boolean;
}

interface MatchGameProps {
  decks: Deck[];
  onComplete: (xp: number, time: number, deckId: string) => void;
  bestRecords: Record<string, number>;
}

export function MatchGame({ decks, onComplete, bestRecords }: MatchGameProps) {
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const { awardStudySession } = useForgeEngine();
  const { triggerReward } = useRewards();
  const [tiles, setTiles] = useState<MatchTile[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [isGameActive, setIsGameActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [wrongMatchIds, setWrongMatchIds] = useState<string[]>([]);
  const [matchesCount, setMatchesCount] = useState(0);

  // ... (shuffle function remains the same)
  const shuffle = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const initGame = useCallback((deck: Deck) => {
    // Take 8-12 pairs
    const pairsCount = Math.min(deck.cards.length, 12);
    const selectedCards = shuffle(deck.cards).slice(0, pairsCount);
    
    const gameTiles: MatchTile[] = [];
    selectedCards.forEach((card) => {
      gameTiles.push({
        id: `term-${card.id}`,
        text: card.term,
        pairId: card.id,
        type: 'term',
        isMatched: false
      });
      gameTiles.push({
        id: `def-${card.id}`,
        text: card.definition,
        pairId: card.id,
        type: 'definition',
        isMatched: false
      });
    });

    setTiles(shuffle(gameTiles));
    setSelectedDeck(deck);
    setIsGameActive(false);
    setIsGameOver(false);
    setStartTime(null);
    setCurrentTime(0);
    setSelectedTiles([]);
    setMatchesCount(0);
    setWrongMatchIds([]);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGameActive && startTime) {
      interval = setInterval(() => {
        setCurrentTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGameActive, startTime]);

  const handleTileClick = (tileId: string) => {
    if (isGameOver || wrongMatchIds.length > 0) return;
    
    const tile = tiles.find(t => t.id === tileId);
    if (!tile || tile.isMatched || selectedTiles.includes(tileId)) return;

    // Start timer on first click
    if (!isGameActive) {
      setIsGameActive(true);
      setStartTime(Date.now());
    }

    const newSelected = [...selectedTiles, tileId];
    setSelectedTiles(newSelected);

    if (newSelected.length === 2) {
      const firstTile = tiles.find(t => t.id === newSelected[0])!;
      const secondTile = tiles.find(t => t.id === newSelected[1])!;

      if (firstTile.pairId === secondTile.pairId && firstTile.type !== secondTile.type) {
        // Correct Match
        setTimeout(() => {
          setTiles(prev => prev.map(t => 
            newSelected.includes(t.id) ? { ...t, isMatched: true } : t
          ));
          setSelectedTiles([]);
          setMatchesCount(prev => {
            const newCount = prev + 1;
            if (newCount === tiles.length / 2) {
              handleGameOver();
            }
            return newCount;
          });
        }, 300);
      } else {
        // Wrong Match
        setWrongMatchIds(newSelected);
        // Time penalty
        setStartTime(prev => prev ? prev - 2000 : null); // 2 second penalty
        setTimeout(() => {
          setSelectedTiles([]);
          setWrongMatchIds([]);
        }, 800);
      }
    }
  };

  const handleGameOver = () => {
    setIsGameActive(false);
    setIsGameOver(true);
    const finalTime = Math.floor((Date.now() - (startTime || 0)) / 1000);
    
    // Calculate speed score: 100 is "fastest reasonable time", 0 is "slow"
    const speedScore = Math.max(0, Math.min(100, (100 - finalTime) * 1.5));
    const { xpGain, embersGain } = awardStudySession(speedScore, 80, 8);
    triggerReward(xpGain, embersGain, "Velocity Match Mastered!");
    
    onComplete(xpGain, finalTime, selectedDeck!.id);
  };

  if (!selectedDeck) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <button
              key={deck.id}
              onClick={() => initGame(deck)}
              className="group relative p-8 glass-card rounded-[2rem] text-left premium-card-hover"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-forge-accent/20 rounded-2xl text-forge-accent group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(251,146,60,0.1)]">
                  <Zap size={24} />
                </div>
                {bestRecords[deck.id] && (
                  <div className="flex items-center gap-2 text-xs font-black text-forge-accent uppercase tracking-widest">
                    <Trophy size={14} />
                    {bestRecords[deck.id]}s
                  </div>
                )}
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{deck.title}</h3>
              <p className="text-stone-500 text-sm font-bold uppercase tracking-widest">{deck.cards.length} Cards</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const remainingMatches = (tiles.length / 2) - matchesCount;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => setSelectedDeck(null)}
          className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors font-black uppercase tracking-widest text-xs"
        >
          <ArrowLeft size={16} />
          Back to Decks
        </button>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
            <Timer size={18} className="text-forge-accent" />
            <span className="text-xl font-black text-white tabular-nums">{currentTime}s</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <span className="text-sm font-black text-white uppercase tracking-widest">{remainingMatches} Left</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isGameOver ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 glass-panel rounded-[3rem] relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-forge-accent to-yellow-400" />
            <div className="w-24 h-24 bg-forge-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-8 forge-glow rotate-6">
              <Trophy size={48} className="text-forge-accent" />
            </div>
            <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-4">Mastered Speed</h2>
            
            <div className="grid grid-cols-2 max-w-sm mx-auto gap-4 mb-12">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">XP Gained</p>
                <div className="flex items-center justify-center gap-1">
                    <Star size={14} className="text-forge-accent fill-current" />
                    <p className="text-2xl font-black text-white">+{Math.round(80 * (1 + Math.max(0, 100 - currentTime) / 100))}</p>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">Time Spent</p>
                <div className="flex items-center justify-center gap-1">
                    <Timer size={14} className="text-forge-accent" />
                    <p className="text-2xl font-black text-white">{currentTime}s</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => initGame(selectedDeck)}
                className="flex items-center gap-2 px-8 py-4 bg-white text-forge-dark rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
              >
                <RotateCcw size={20} />
                Try Again
              </button>
              <button
                onClick={() => setSelectedDeck(null)}
                className="px-8 py-4 bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/20 transition-colors border border-white/5"
              >
                Return to Decks
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tiles.map((tile) => (
              <motion.button
                key={tile.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: tile.isMatched ? 0 : 1,
                  scale: tile.isMatched ? 0.5 : 1,
                  x: wrongMatchIds.includes(tile.id) ? [0, -10, 10, -10, 10, 0] : 0
                }}
                transition={{
                  x: { duration: 0.4 },
                  opacity: { duration: 0.3 }
                }}
                onClick={() => handleTileClick(tile.id)}
                disabled={tile.isMatched}
                className={cn(
                  "relative h-40 p-4 rounded-3xl border-2 transition-all duration-200 flex items-center justify-center text-center overflow-hidden group",
                  selectedTiles.includes(tile.id)
                    ? wrongMatchIds.includes(tile.id)
                      ? "bg-red-500/20 border-red-500 text-red-500"
                      : "bg-forge-accent border-forge-accent text-forge-dark scale-105 shadow-xl shadow-forge-accent/20"
                    : "bg-white/5 border-white/10 text-stone-300 hover:bg-white/10 hover:border-white/20"
                )}
              >
                <div className={cn(
                  "text-sm font-bold leading-tight line-clamp-4 markdown-content",
                  selectedTiles.includes(tile.id) && !wrongMatchIds.includes(tile.id) ? "text-inherit" : ""
                )}>
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {tile.text}
                  </ReactMarkdown>
                </div>
                
                {/* Subtle indicator for type */}
                <div className="absolute bottom-2 right-2 opacity-20">
                  {tile.type === 'term' ? <Zap size={12} /> : <AlertCircle size={12} />}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
