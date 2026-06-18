import React, { useState, useCallback } from 'react';
import { FREE_LIMITS } from '../constants';
import { Plus, Trash2, ChevronLeft, ChevronRight, Layers, RotateCw, Globe, Lock, Check, Edit2, Save, X as CloseIcon, Sparkles, Brain, Zap, Clock, Star, CheckCircle2, XCircle, Loader2, AlertCircle, TrendingUp, Target, MessageSquareQuote, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Deck, Flashcard, DeckCategory, SRSIntelligenceAnalysis } from '../types';
import { cn, generateId } from '../lib/utils';
import { soundService } from '../services/soundService';
import { publishDeck } from '../services/dataService';
import { calculateNextReview, getDueCards, getWeakestCards } from '../services/spacedRepetitionService';

import { useForgeStore } from '../contexts/ForgeStoreContext';
import { useAppState } from '../hooks/useAppState';
import { PyraMascot } from './PyraMascot';
import { HelpModal } from './HelpModal';
import { PowerUpPanel } from './PowerUpPanel';
import { ButtonGuard } from '../services/apiManager';

interface FlashcardsProps {
  decks: Deck[];
  onUpdate: (decks: Deck[]) => void;
}

const CATEGORIES: DeckCategory[] = ['Educational', 'Personal', 'Work', 'Other'];

export const Flashcards: React.FC<FlashcardsProps> = ({ decks, onUpdate }) => {
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [category, setCategory] = useState<DeckCategory>('Educational');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<'standard' | 'smart' | 'weakest'>('standard');
  const [startTime, setStartTime] = useState(Date.now());
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<SRSIntelligenceAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { trackQuestProgress, awardXP, processSessionCompletion, purchaseEmberItem, embers, currentTheme } = useForgeStore();
  const { state, setState } = useAppState();

  const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);

  const activeDeck = decks.find(d => d.id === activeDeckId);

  // Theme-specific logic
  const isEigenstate = currentTheme === 'Eigenstate';
  const isSignalLost = currentTheme === 'Signal Lost';

  const getReviewCards = useCallback(() => {
    if (!activeDeck) return [];
    if (reviewMode === 'smart') return getDueCards(activeDeck.cards);
    if (reviewMode === 'weakest') return getWeakestCards(activeDeck.cards);
    return activeDeck.cards;
  }, [activeDeck, reviewMode]);

  const cards = getReviewCards();

  // Reset index when changing mode
  React.useEffect(() => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStartTime(Date.now());
    setSessionHistory([]);
    setAnalysis(null);
  }, [reviewMode, activeDeckId]);

  // Keyboard Navigation
  React.useEffect(() => {
    if (!activeDeck || cards.length === 0 || analysis) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === 'ArrowLeft') {
        if (currentCardIndex > 0) {
          setCurrentCardIndex(prev => prev - 1);
          setIsFlipped(false);
          setStartTime(Date.now());
          soundService.playClick();
        }
      } else if (e.key === 'ArrowRight') {
        if (currentCardIndex < cards.length - 1) {
          setCurrentCardIndex(prev => prev + 1);
          setIsFlipped(false);
          setStartTime(Date.now());
          soundService.playClick();
        }
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
        soundService.playClick();
        if (!isFlipped) {
          trackQuestProgress('card_flip', 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDeck, currentCardIndex, isFlipped, trackQuestProgress, cards.length, analysis]);

  const handleGrade = async (grade: 0 | 1 | 2 | 3) => {
    if (!activeDeck || cards.length === 0) return;
    const currentCard = cards[currentCardIndex];
    const duration = Date.now() - startTime;
    
    // Store history item for AI analysis
    const historyItem = {
      card_id: currentCard.id,
      front: currentCard.term,
      back: currentCard.definition,
      grade_given: grade + 2, // Mapping 0-3 to something closer to 0-5 for AI schema
      response_time_ms: duration,
      ease_factor_before: currentCard.ease || 2.5,
      interval_before_days: currentCard.interval || 0,
      repetition_count: currentCard.totalAttempts || 0,
      times_failed_historically: currentCard.wrongCount || 0,
      card_type: currentCard.cardType || 'definition',
      topic_tag: currentCard.topicTag || activeDeck.title,
      memory_hook_shown: currentCard.memoryHook
    };

    if (grade === 0) {
      // Logic for suggested power up removed as it's now contextually integrated or manual
    }

    const updates = calculateNextReview(currentCard, grade, duration);
    
    setSessionHistory(prev => [...prev, {
      ...historyItem,
      interval_after_days: updates.interval,
      ease_factor_after: updates.ease
    }]);

    const updatedDecks = decks.map(d => 
      d.id === activeDeckId ? {
        ...d,
        cards: d.cards.map(c => c.id === currentCard.id ? { ...c, ...updates } : c)
      } : d
    );
    
    onUpdate(updatedDecks);
    
    // XP Rewards
    const xp = grade === 3 ? 15 : grade === 2 ? 10 : grade === 1 ? 5 : 2;
    awardXP(xp);
    trackQuestProgress('card_review', 1);
    
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
      setStartTime(Date.now());
    } else {
      // Completed last card
      soundService.playSuccess();
      runIntelligenceAnalysis();
    }
  };

  const runIntelligenceAnalysis = async () => {
    if (!activeDeck || sessionHistory.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const { analyzeSRSSession } = await import('../services/aiService');
      
      const fullDeckStats = {
        total_cards: activeDeck.cards.length,
        mature_cards: activeDeck.cards.filter(c => (c.interval || 0) >= 21).length,
        young_cards: activeDeck.cards.filter(c => (c.interval || 0) > 0 && (c.interval || 0) < 21).length,
        new_cards: activeDeck.cards.filter(c => (c.interval || 0) === 0).length,
        suspended_cards: 0,
        average_ease_factor: activeDeck.cards.reduce((acc, c) => acc + (c.ease || 2.5), 0) / activeDeck.cards.length,
        overall_retention_rate: 0.85, // Mocking but could be calculated
        study_streak_days: state.stats.streak
      };

      const result = await analyzeSRSSession(
        state.stats.name || 'Student',
        activeDeck.title,
        {
          session_id: generateId(),
          cards_reviewed: sessionHistory,
          session_duration_ms: sessionHistory.reduce((acc, h) => acc + h.response_time_ms, 0),
          cards_due_count: getDueCards(activeDeck.cards).length,
          cards_new_count: activeDeck.cards.filter(c => (c.interval || 0) === 0).length
        },
        fullDeckStats
      );

      setAnalysis(result);

      // Award Embers via the new engine
      const correctCount = sessionHistory.filter(h => h.grade_given >= 4).length;
      const accuracy = Math.round((correctCount / sessionHistory.length) * 100);
      
      await processSessionCompletion({
        session_type: 'srs_review',
        accuracy_percent: accuracy,
        session_duration_minutes: Math.ceil(sessionHistory.reduce((acc, h) => acc + h.response_time_ms, 0) / 60000),
        personal_best_broken: accuracy > (state.stats as any).best_accuracy || false,
        new_mature_cards: sessionHistory.filter(h => h.interval_before_days < 21 && h.interval_after_days >= 21).length,
        accuracy_improvement_vs_last_session: result.session_analysis.retention_rate_this_session > 0.8 ? 15 : 0, // Simplified nudge
        streak_continued: true
      });
    } catch (error) {
      console.error("Intelligence analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyInterventions = () => {
    if (!analysis || !activeDeck) return;

    let updatedDecks = [...decks];
    
    // Apply improved hooks
    analysis.improved_memory_hooks.forEach(hook => {
      updatedDecks = updatedDecks.map(d => 
        d.id === activeDeckId ? {
          ...d,
          cards: d.cards.map(c => c.id === hook.card_id ? { ...c, memoryHook: hook.new_hook } : c)
        } : d
      );
    });

    // Add new cards
    if (analysis.new_cards_generated.length > 0) {
      const newFlashcards: Flashcard[] = analysis.new_cards_generated.map(nc => ({
        id: generateId(),
        term: nc.front,
        definition: nc.back,
        explanation: nc.generated_because,
        imagePrompt: nc.front,
        cardType: nc.card_type as any,
        topicTag: nc.topic_tag,
        memoryHook: nc.memory_hook,
        ease: nc.sm2_initial_ease_factor,
        interval: nc.sm2_initial_interval_days,
        nextReviewDate: Date.now() + (nc.sm2_initial_interval_days * 24 * 60 * 60 * 1000)
      }));

      updatedDecks = updatedDecks.map(d => 
        d.id === activeDeckId ? { ...d, cards: [...d.cards, ...newFlashcards] } : d
      );
    }

    onUpdate(updatedDecks);
    soundService.playSuccess();
    setAnalysis(null);
    setReviewMode('standard');
    setActiveDeckId(null);
  };

  const createDeck = async () => {
    if (!newDeckTitle.trim()) return;
    const newDeck: Deck = {
      id: generateId(),
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

  const addCard = async (term: string, definition: string, explanation: string, imagePrompt?: string) => {
    if (!activeDeck) return;
    
    let imageUrl: string | undefined;
    if (imagePrompt?.trim()) {
      const { generateImage } = await import('../services/aiService');
      imageUrl = await generateImage(imagePrompt) || undefined;
    }

    const newCard: Flashcard = {
      id: generateId(),
      term,
      definition,
      explanation,
      imagePrompt: imagePrompt || undefined,
      imageUrl
    };
    const updatedDecks = decks.map(d => 
      d.id === activeDeckId ? { ...d, cards: [...d.cards, newCard] } : d
    );
    onUpdate(updatedDecks);
    soundService.playSuccess();
  };

  const updateCard = (cardId: string, term: string, definition: string, explanation?: string, imagePrompt?: string, imageUrl?: string) => {
    if (!activeDeck) return;
    const updatedDecks = decks.map(d => 
      d.id === activeDeckId ? {
        ...d,
        cards: d.cards.map(c => c.id === cardId ? { ...c, term, definition, explanation: explanation ?? c.explanation, imagePrompt, imageUrl: imageUrl ?? c.imageUrl } : c)
      } : d
    );
    onUpdate(updatedDecks);
  };

  const regenerateCardImage = async (cardId: string) => {
    if (!activeDeck) return;
    const card = activeDeck.cards.find(c => c.id === cardId);
    if (!card) return;

    setIsGeneratingImage(cardId);
    try {
      const canProceed = ButtonGuard.checkAndSet('image_gen_' + cardId);
      if (!canProceed) {
        // Silent fail or toast could be added here
        return;
      }
      const { generateImage } = await import('../services/aiService');
      const prompt = card.imagePrompt || `Highly detailed educational diagram of ${card.term}: ${card.definition.substring(0, 50)}`;
      const imageUrl = await generateImage(prompt, true);
      
      if (imageUrl) {
        updateCard(cardId, card.term, card.definition, card.explanation, prompt, imageUrl);
        soundService.playSuccess();
      }
    } catch (err) {
      console.error("Failed to generate card image:", err);
    } finally {
      setIsGeneratingImage(null);
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

  const [isGeneratingAdaptive, setIsGeneratingAdaptive] = useState(false);

  const reinforceWeakSpots = async () => {
    if (!activeDeck) return;
    const missed = activeDeck.cards.filter(c => (c.wrongCount || 0) > 0);
    if (missed.length === 0) return;

    setIsGeneratingAdaptive(true);
    try {
      const { generateAdaptiveDeck } = await import('../services/aiService');
      const newCards = await generateAdaptiveDeck(missed, activeDeck.title);
      
      if (newCards.length > 0) {
        const updatedDecks = decks.map(d => 
          d.id === activeDeckId ? { ...d, cards: [...d.cards, ...newCards] } : d
        );
        onUpdate(updatedDecks);
        soundService.playSuccess();
      }
    } catch (error) {
      console.error("Adaptive generation failed:", error);
    } finally {
      setIsGeneratingAdaptive(false);
    }
  };

  if (activeDeck) {
    const cards = activeDeck.cards;
    const currentCard = cards[currentCardIndex];

    return (
      <div className="max-w-2xl mx-auto">
        <HelpModal 
            isOpen={isHelpOpen} 
            onClose={() => setIsHelpOpen(false)}
            title="Flashcards"
            description="Review and memorize concepts using flashcards. Flip cards to reveal answers and grade how well you remember them."
            imageUrl="https://picsum.photos/seed/flashcards/800/450"
        />
        <button
          onClick={() => setActiveDeckId(null)}
          className="mb-6 flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors text-sm font-medium"
        >
          <ChevronLeft size={18} />
          Back to Decks
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
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
            <button onClick={() => setIsHelpOpen(true)} className="p-2 text-stone-400 hover:text-forge-accent transition-colors">
              <HelpCircle size={20} />
            </button>
          </div>
          
          <div className="flex bg-stone-100 p-1 rounded-2xl">
            <button 
              onClick={() => setReviewMode('standard')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                reviewMode === 'standard' ? "bg-white text-stone-800 shadow-sm" : "text-stone-400 hover:text-stone-600"
              )}
            >
              <Layers size={14} /> Full Deck
            </button>
            <button 
              onClick={() => setReviewMode('smart')}
              disabled={getDueCards(activeDeck.cards).length === 0}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-30",
                reviewMode === 'smart' ? "bg-white text-forge-accent shadow-sm" : "text-stone-400 hover:text-stone-600"
              )}
            >
              <Brain size={14} /> Smart Review ({getDueCards(activeDeck.cards).length})
            </button>
            <button 
              onClick={() => setReviewMode('weakest')}
              disabled={activeDeck.cards.filter(c => (c.wrongCount || 0) > 0).length === 0}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-30",
                reviewMode === 'weakest' ? "bg-white text-red-500 shadow-sm" : "text-stone-400 hover:text-stone-600"
              )}
            >
              <Zap size={14} /> Weak Spots
            </button>
          </div>

          <span className="text-xs font-medium text-stone-400 uppercase tracking-widest whitespace-nowrap">
            {cards.length > 0 ? `${currentCardIndex + 1} / ${cards.length}` : 'Done'}
          </span>
        </div>

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-black/5 shadow-xl p-12 text-center">
            <PyraMascot 
              expression="thinking" 
              message="Analysing session patterns, response times, and cognitive load..."
              className="mb-6"
            />
            <h3 className="text-xl font-bold text-stone-800 mb-2">SRS Intelligence Analysis</h3>
            <p className="text-stone-400 text-sm max-w-xs mx-auto">
              Optimizing your mastery path...
            </p>
          </div>
        ) : analysis ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-[3rem] border border-black/5 shadow-xl overflow-hidden">
              <div className="p-8 md:p-12 border-b border-stone-50 bg-stone-50/50">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      analysis.session_analysis.session_quality === 'excellent' ? "bg-emerald-100 text-emerald-700" :
                      analysis.session_analysis.session_quality === 'good' ? "bg-blue-100 text-blue-700" :
                      analysis.session_analysis.session_quality === 'average' ? "bg-stone-100 text-stone-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      Session Quality: {analysis.session_analysis.session_quality}
                    </div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      <Clock size={10} className="inline mr-1" />
                      {Math.round(analysis.session_analysis.average_response_time_ms / 1000)}s Avg Response
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-forge-accent uppercase tracking-widest">
                    <TrendingUp size={12} />
                    Retention: {Math.round(analysis.session_analysis.retention_rate_this_session * 100)}%
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-stone-800 mb-4">{analysis.motivational_output.honest_assessment}</h3>
                <p className="text-stone-500 text-sm leading-relaxed mb-6">{analysis.session_analysis.session_quality_reason}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-stone-100">
                    <p className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-1">Fatigue Level</p>
                    <p className="text-xs font-bold text-stone-700">{analysis.session_analysis.cognitive_load_assessment}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-stone-900 text-white">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">One Thing to Fix</p>
                    <p className="text-xs font-bold">{analysis.motivational_output.one_thing_to_fix}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-12 space-y-10">
                {/* Patterns */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-6 flex items-center gap-2">
                    <AlertCircle size={12} className="text-red-500" />
                    Detected Learning Patterns
                  </h4>
                  <div className="space-y-4">
                    {analysis.pattern_detection.map((pattern, i) => (
                      <div key={i} className="p-5 rounded-3xl bg-stone-50 border border-stone-100">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-bold text-stone-800 flex items-center gap-2">
                            {pattern.pattern_name}
                            <span className={cn(
                              "text-[8px] px-1.5 py-0.5 rounded uppercase font-black",
                              pattern.severity === 'critical' ? "bg-red-500 text-white" :
                              pattern.severity === 'moderate' ? "bg-orange-500 text-white" :
                              "bg-stone-200 text-stone-600"
                            )}>
                              {pattern.severity}
                            </span>
                          </h5>
                        </div>
                        <p className="text-xs text-stone-500 mb-3">{pattern.explanation}</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400">
                          <Target size={10} />
                          Action: {pattern.recommended_action}
                        </div>
                      </div>
                    ))}
                    {analysis.pattern_detection.length === 0 && (
                      <p className="text-xs text-stone-400 italic">No significant patterns detected this session. Consistent performance!</p>
                    )}
                  </div>
                </div>

                {/* Interventions */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-6 flex items-center gap-2">
                    <Sparkles size={12} className="text-forge-accent" />
                    AI Intelligence Interventions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-emerald-500 text-white rounded-lg">
                          <Check size={14} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Memory Hooks Improved</p>
                      </div>
                      <p className="text-2xl font-bold text-emerald-900 mb-1">{analysis.improved_memory_hooks.length}</p>
                      <p className="text-xs text-emerald-700/70">Refining card connections for better recall.</p>
                    </div>
                    <div className="p-6 rounded-[2rem] bg-blue-50 border border-blue-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-blue-500 text-white rounded-lg">
                          <Plus size={14} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">New Cards Generated</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-900 mb-1">{analysis.new_cards_generated.length}</p>
                      <p className="text-xs text-blue-700/70">Scaffolding concepts that caused confusion.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-12 bg-stone-50 border-t border-stone-100">
                <button
                  onClick={applyInterventions}
                  className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl"
                >
                  Apply AI Interventions & End Session
                </button>
              </div>
            </div>
            
            <div className="p-8 rounded-[3rem] bg-forge-accent text-forge-dark flex items-center justify-between gap-6">
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Motivation & Goals</p>
                <h5 className="text-lg font-bold mb-1">{analysis.motivational_output.milestone_approaching || "Mastery is a journey, not a destination."}</h5>
                <p className="text-xs font-medium opacity-80">{analysis.motivational_output.streak_status}</p>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl">
                <Star size={32} />
              </div>
            </div>
          </motion.div>
        ) : cards.length > 0 ? (
          <div className="flex flex-col items-center gap-8">
            <div 
              className="relative w-full h-96 perspective-1000 cursor-pointer"
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
                <div className={cn(
                  "absolute inset-0 backface-hidden flex flex-col items-center justify-center p-12 glass-card rounded-[3rem] text-center",
                  isEigenstate && !isFlipped && "blur-sm opacity-80"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-[3rem] opacity-50" />
                  <div className="absolute top-8 left-8 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-forge-accent shadow-[0_0_10px_rgba(251,146,60,0.8)] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Practice</span>
                  </div>
                  
                  {isSignalLost && (
                    <div className="absolute inset-0 scanline-crt opacity-10 pointer-events-none rounded-[3rem]" />
                  )}

                  {currentCard.imageUrl && (
                    <div 
                      className="absolute top-6 right-6 w-16 h-16 rounded-2xl overflow-hidden border border-black/5 hover:scale-110 transition-transform shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedImageUrl(currentCard.imageUrl!);
                      }}
                    >
                      <img 
                        src={currentCard.imageUrl} 
                        alt="Hint" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <span className="text-xs font-bold text-stone-200 uppercase tracking-widest mb-6">Topic</span>
                  
                  <div className="text-3xl font-extrabold text-white markdown-content italic tracking-tight leading-tight drop-shadow-md">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentCard.term}</ReactMarkdown>
                  </div>
                  <div className="absolute bottom-8 flex items-center gap-2 text-stone-300 text-[10px] font-bold uppercase tracking-widest">
                    <RotateCw size={14} />
                    Flip to Reveal Answer
                  </div>
                </div>
                {/* Back */}
                <div 
                  className={cn(
                    "absolute inset-0 backface-hidden flex flex-col items-center justify-between p-12 glass-panel rounded-[3rem] text-center rotate-y-180 overflow-y-auto",
                    isSignalLost && "glitch-static opacity-95"
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-forge-dark to-transparent pointer-events-none rounded-[3rem] opacity-80" />
                  
                  <div className="w-full flex flex-col items-center gap-6 relative z-10 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">Meaning</span>
                    </div>

                    {currentCard.imageUrl ? (
                      <div 
                        className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 hover:scale-110 transition-transform shadow-2xl group/img relative"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedImageUrl(currentCard.imageUrl!);
                        }}
                      >
                        <img 
                          src={currentCard.imageUrl} 
                          alt={currentCard.term} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                          <Plus size={16} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          regenerateCardImage(currentCard.id);
                        }}
                        disabled={!!isGeneratingImage}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-white transition-all"
                      >
                        {isGeneratingImage === currentCard.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} className="text-forge-accent" />
                        )}
                        {isGeneratingImage === currentCard.id ? "Forging Visual..." : "Generate Visual"}
                      </button>
                    )}
                    
                    <div className="text-xl md:text-2xl text-white leading-relaxed markdown-content prose prose-invert font-medium max-w-lg mb-4">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {currentCard.definition.split('---')[0]}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {(currentCard.explanation || currentCard.definition.includes('---')) && (
                    <div className="w-full mt-auto">
                      <div className="relative group/exp">
                        <div className="absolute -inset-1 bg-gradient-to-r from-forge-accent/20 to-orange-500/20 rounded-[2rem] blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                        <div className="relative bg-white/5 border border-white/10 rounded-[2rem] p-6 text-left backdrop-blur-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={14} className="text-forge-accent" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-forge-accent">Plain English</span>
                          </div>
                          <div className="text-sm text-stone-300 leading-relaxed font-medium">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {currentCard.explanation || (currentCard.definition.split('---')[1] || '')}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isSignalLost && (
                    <div className="absolute inset-0 scanline-crt opacity-20 pointer-events-none rounded-[3rem]" />
                  )}
                </div>
              </motion.div>
            </div>

            <AnimatePresence>
              {expandedImageUrl && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setExpandedImageUrl(null)}
                  className="fixed inset-0 z-[100] bg-black/90 p-4 md:p-12 flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center gap-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      onClick={() => setExpandedImageUrl(null)}
                      className="absolute top-0 -right-4 bg-white/10 border border-white/20 p-2 rounded-full text-white hover:bg-white/20 transition-colors"
                    >
                      <CloseIcon size={24} />
                    </button>
                    <div className="w-full h-full overflow-hidden rounded-[2.5rem] border border-white/10 shadow-2xl">
                      <img 
                        src={expandedImageUrl} 
                        alt="Expanded visual" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    {currentCard.imagePrompt && (
                      <p className="text-stone-400 text-sm font-medium italic text-center max-w-2xl px-4">
                        {currentCard.imagePrompt}
                      </p>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {isFlipped ? (
                <div className="flex flex-col items-center gap-6 w-full">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-wrap items-center justify-center gap-4 w-full"
                  >
                    <button
                      onClick={() => handleGrade(0)}
                      className="group flex flex-col items-center gap-2 p-4 rounded-3xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:border-red-500 transition-all w-24"
                    >
                      <XCircle size={24} className="text-red-500 group-hover:text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-500 group-hover:text-white">Forgot</span>
                    </button>
                    <button
                      onClick={() => handleGrade(1)}
                      className="group flex flex-col items-center gap-2 p-4 rounded-3xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500 hover:border-orange-500 transition-all w-24"
                    >
                      <Clock size={24} className="text-orange-500 group-hover:text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 group-hover:text-white">Hard</span>
                    </button>
                    <button
                      onClick={() => handleGrade(2)}
                      className="group flex flex-col items-center gap-2 p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:border-emerald-500 transition-all w-24"
                    >
                      <CheckCircle2 size={24} className="text-emerald-500 group-hover:text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 group-hover:text-white">Good</span>
                    </button>
                    <button
                      onClick={() => handleGrade(3)}
                      className="group flex flex-col items-center gap-2 p-4 rounded-3xl bg-forge-accent/10 border border-forge-accent/20 hover:bg-forge-accent hover:border-forge-accent transition-all w-24"
                    >
                      <Star size={24} className="text-forge-accent group-hover:text-forge-dark" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-forge-accent group-hover:text-forge-dark">Easy</span>
                    </button>
                  </motion.div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-6"
                  >
                    <button
                      disabled={currentCardIndex === 0}
                      onClick={() => {
                        setCurrentCardIndex(prev => prev - 1);
                        setIsFlipped(false);
                        setStartTime(Date.now());
                        soundService.playClick();
                      }}
                      className="p-5 rounded-3xl bg-white shadow-xl text-stone-400 hover:text-stone-800 disabled:opacity-0 transition-all border border-stone-100"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-forge-accent animate-ping mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Recall Active</p>
                    </div>

                    <button
                      disabled={currentCardIndex === cards.length - 1}
                      onClick={() => {
                        setCurrentCardIndex(prev => prev + 1);
                        setIsFlipped(false);
                        setStartTime(Date.now());
                        soundService.playClick();
                      }}
                      className="p-5 rounded-3xl bg-white shadow-xl text-stone-400 hover:text-stone-800 disabled:opacity-0 transition-all border border-stone-100"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {cards.length > 0 && (
              <div className="mt-12 flex justify-center w-full">
                <PowerUpPanel 
                  context={{
                    card_front: currentCard?.term,
                    card_back: currentCard?.definition,
                    topic: activeDeck?.title,
                    topic_tag: currentCard?.topicTag
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-stone-100 p-12">
            <Brain size={48} className={cn("text-stone-200 mx-auto mb-6", isGeneratingAdaptive && "animate-pulse text-forge-accent")} />
            <h3 className="text-xl font-bold text-stone-800 mb-2">Review Loop Clear</h3>
            <p className="text-stone-400 mb-8 max-w-sm mx-auto">You've mastered all current cards. Take a break or review everything again.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => setReviewMode('standard')}
                className="px-8 py-3 bg-stone-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all w-full sm:w-auto"
              >
                Review Full Deck
              </button>
              
              {activeDeck.cards.some(c => (c.wrongCount || 0) > 0) && (
                <button 
                  onClick={reinforceWeakSpots}
                  disabled={isGeneratingAdaptive}
                  className="px-8 py-3 bg-forge-accent text-forge-dark rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all forge-glow disabled:opacity-50 w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  {isGeneratingAdaptive ? <RotateCw className="animate-spin" size={14} /> : <Zap size={14} />}
                  Reinforce Weak Spots (AI)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Removed fixed Arsenal panel as it is now moved to the bottom of the card UI */}

        {cards.length > 0 && (
          <div className="mt-12 space-y-12">
            <div>
               <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-4">Manage Blueprints</h3>
               <div className="space-y-3">
                 {cards.map((card, i) => (
                   <div key={card.id} className="group p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-4">
                     <div className="flex items-center justify-between gap-4">
                        <button
                          onClick={() => removeCard(card.id)}
                          className="px-2 text-stone-600 hover:text-red-500 transition-colors text-xs font-mono"
                        >
                          [x]
                        </button>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <input
                            type="text"
                            value={card.term}
                            onChange={(e) => updateCard(card.id, e.target.value, card.definition, card.explanation, card.imagePrompt)}
                            className="bg-transparent text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-forge-accent/30 rounded px-1"
                          />
                          <input
                            type="text"
                            value={card.definition}
                            onChange={(e) => updateCard(card.id, card.term, e.target.value, card.explanation, card.imagePrompt)}
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
                     <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase text-white/20 ml-1">Detailed Explanation</label>
                        <textarea
                          placeholder="Provide the 'Why' behind the concept..."
                          value={card.explanation || ''}
                          onChange={(e) => updateCard(card.id, card.term, card.definition, e.target.value, card.imagePrompt)}
                          className="w-full bg-transparent text-xs text-stone-500 font-medium focus:outline-none focus:ring-1 focus:ring-forge-accent/20 rounded px-1 min-h-[60px] resize-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} className="text-forge-accent shrink-0" />
                        <input
                          type="text"
                          placeholder="Image Prompt (Empty for no image)"
                          value={card.imagePrompt || ''}
                          onChange={(e) => updateCard(card.id, card.term, card.definition, card.explanation, e.target.value)}
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
    <div className="max-w-[1400px] mx-auto space-y-12 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
        <div>
          <h2 className="text-4xl md:text-5xl font-black font-display uppercase italic tracking-tighter text-white">Study Decks</h2>
          <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em] mt-3">Spaced Repetition Flashcards</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-3 px-8 py-4 bg-white text-forge-dark rounded-2xl transition-all font-display font-black uppercase italic tracking-tighter shadow-[0_15px_40px_rgba(255,255,255,0.15)] group"
        >
          <Plus size={20} className="text-forge-accent group-hover:rotate-90 transition-transform" />
          Create New Deck
        </motion.button>
      </div>

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 p-10 glass-panel rounded-[3rem] border border-white/10 relative overflow-hidden cinematic-shadow"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-forge-accent/5 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 ml-2">Master Title</label>
              <input
                autoFocus
                type="text"
                placeholder="Assign a high-level identifier..."
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
                className="w-full px-8 py-6 rounded-[2rem] bg-white/[0.03] border border-white/10 focus:border-forge-accent/50 text-2xl font-black italic uppercase tracking-tighter text-white outline-none transition-all placeholder:text-white/10"
              />
            </div>

            <div className="flex flex-wrap items-end justify-between gap-8">
              <div className="flex flex-wrap gap-12">
                 <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 ml-2">Pick a Category</label>
                   <div className="flex gap-3">
                     {CATEGORIES.map(cat => (
                       <button
                         key={cat}
                         onClick={() => setCategory(cat)}
                         className={cn(
                           "px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border",
                           category === cat 
                             ? "bg-forge-accent text-forge-dark border-forge-accent shadow-[0_0_20px_rgba(251,146,60,0.3)]" 
                             : "bg-white/5 text-white/30 border-white/5 hover:border-white/20"
                         )}
                       >
                         {cat}
                       </button>
                     ))}
                   </div>
                 </div>

                 <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 ml-2">Privacy Setting</label>
                   <button
                      onClick={() => setIsPublic(!isPublic)}
                      className={cn(
                        "flex items-center gap-4 px-6 py-2.5 rounded-full border transition-all",
                        isPublic 
                          ? "bg-forge-accent/10 border-forge-accent text-forge-accent" 
                          : "bg-white/5 border-white/10 text-white/30"
                      )}
                   >
                     {isPublic ? <Globe size={16} /> : <Lock size={16} />}
                     <span className="text-[10px] font-black uppercase tracking-widest">{isPublic ? 'Public' : 'Just Me'}</span>
                   </button>
                 </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-8 py-4 text-white/30 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors"
                >
                  Terminate
                </button>
                <button
                  onClick={createDeck}
                  className="px-10 py-4 bg-white text-forge-dark rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-[0_10px_30px_rgba(255,255,255,0.2)] transition-all"
                >
                  Finalize Deck
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {decks.map((deck) => (
          <motion.div
            key={deck.id}
            whileHover={{ y: -10, scale: 1.02 }}
            onClick={() => setActiveDeckId(deck.id)}
            className="group cursor-pointer p-10 glass-card rounded-[3rem] border border-white/5 hover:border-forge-accent/40 transition-all cinematic-shadow relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-forge-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-start justify-between mb-8 relative z-10">
              <div className="p-5 bg-forge-accent/10 text-forge-accent rounded-[1.5rem] group-hover:shadow-[0_0_25px_rgba(251,146,60,0.2)] transition-all">
                <Layers size={32} />
              </div>
              <button
                onClick={(e) => deleteDeck(deck.id, e)}
                className="opacity-0 group-hover:opacity-100 p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all backdrop-blur-md"
              >
                <Trash2 size={20} />
              </button>
            </div>
            <div className="relative z-10 space-y-2">
              <h3 className="text-2xl font-black font-display uppercase italic tracking-tighter text-white drop-shadow-sm group-hover:text-forge-accent transition-colors">{deck.title}</h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{deck.cards.length} Cards in Deck</span>
                <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-forge-accent/30 w-1/3" />
                </div>
              </div>
            </div>
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

const AddCardForm: React.FC<{ onAdd: (t: string, d: string, e: string, p?: string) => void }> = ({ onAdd }) => {
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [explanation, setExplanation] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !definition.trim()) return;
    onAdd(term, definition, explanation, imagePrompt || undefined);
    setTerm('');
    setDefinition('');
    setExplanation('');
    setImagePrompt('');
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <input
          type="text"
          placeholder="Topic"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-forge-accent/50 text-white font-bold outline-none placeholder:text-white/10 transition-all"
        />
        <input
          type="text"
          placeholder="Definition"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-forge-accent/50 text-white font-bold outline-none placeholder:text-white/10 transition-all"
        />
      </div>
      <div className="space-y-2">
        <textarea
          placeholder="Simple Explanation (Layman's Terms)"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-forge-accent/50 text-white font-bold outline-none placeholder:text-white/10 transition-all min-h-[100px] resize-none"
        />
      </div>
      <div className="relative group/input">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-forge-accent transition-colors">
          <Sparkles size={16} />
        </div>
        <input
          type="text"
          placeholder="Optional: Neural Image Prompt (e.g., A panoramic view of Mars colony)"
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-forge-accent/50 text-white text-xs font-bold outline-none placeholder:text-white/10 transition-all"
        />
      </div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        className="w-full py-5 bg-white text-forge-dark rounded-[1.5rem] font-display font-black uppercase italic tracking-tighter hover:shadow-[0_10px_30px_rgba(255,255,255,0.1)] transition-all"
      >
        Initialize Neural Card
      </motion.button>
    </form>
  );
};

const GradingButton: React.FC<{ onClick: () => void, icon: React.ReactNode, label: string, sub: string, color: string }> = ({ onClick, icon, label, sub, color }) => (
  <motion.button
    whileHover={{ y: -5, scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={cn(
      "w-36 flex flex-col items-center gap-3 p-8 rounded-[2.5rem] border transition-all cinematic-shadow group",
      color
    )}
  >
    <div className="p-4 bg-black/10 rounded-2xl group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div className="text-center">
      <span className="block text-[12px] font-black uppercase tracking-tighter group-hover:text-white transition-colors">{label}</span>
      <span className="block text-[8px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:text-white/60 transition-colors mt-1">{sub}</span>
    </div>
  </motion.button>
);

const EmberAbilityButton: React.FC<{ disabled: boolean, onClick: () => void, loading: boolean, icon: React.ReactNode, label: string, cost: number }> = ({ disabled, onClick, loading, icon, label, cost }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className="px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-forge-accent hover:border-forge-accent/50 hover:bg-white/[0.05] transition-all flex items-center gap-3 disabled:opacity-20"
  >
    {loading ? <Loader2 size={12} className="animate-spin" /> : <div className="text-forge-accent/80">{icon}</div>}
    <span>{label}</span>
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-forge-accent/10 rounded-full text-forge-accent">
       <span className="text-[8px] font-black">{cost}</span>
    </div>
  </button>
);

export default Flashcards;
