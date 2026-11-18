import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStateContext } from '../contexts/AppStateContext';
import { FREE_LIMITS } from '../constants';
import { FileText, Download, Printer, Upload, Loader2, X, Sparkles, BookOpen, Eye, Calendar, Award } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { HelpButton } from './HelpSystem';
import { ProgressBar } from './ProgressBar';
import { generateStudyGuide, DetailedStudyGuide } from '../services/aiService';
import { extractTextFromFile } from '../lib/extraction';

interface SavedGuide extends DetailedStudyGuide {
  id: string;
  timestamp: number;
}

export const StudyGuideViewer: React.FC = () => {
  const { state, setState } = useAppStateContext();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState('');
  const [generatedGuide, setGeneratedGuide] = useState<DetailedStudyGuide | null>(null);
  const [activeTab, setActiveTab] = useState<'markdown' | 'interactive'>('markdown');
  const [gallery, setGallery] = useState<SavedGuide[]>(() => {
    try {
      const saved = localStorage.getItem('forge_study_guides_gallery');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [previewGuide, setPreviewGuide] = useState<SavedGuide | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('forge_study_guides_gallery', JSON.stringify(gallery));
  }, [gallery]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const triggerGeneration = (textToUse: string, guideTitle: string) => {
    setIsUploading(true);
    setError(null);
    setProgress(15);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.floor(Math.random() * 8) + 1, 92));
    }, 450);

    generateStudyGuide(textToUse, guideTitle)
      .then((guide) => {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setGeneratedGuide(guide);
          setActiveTab('interactive');
          
          // Add to Gallery
          const newGuide: SavedGuide = {
            id: `guide_${Date.now()}`,
            timestamp: Date.now(),
            ...guide
          };
          setGallery(prev => [newGuide, ...prev]);
        }, 500);
      })
      .catch((err) => {
        clearInterval(progressInterval);
        setIsUploading(false);
        console.error("Failed generating study guide:", err);
        if (err.message?.includes('429') || err.status === 429) {
          setError("Daily API quota limit exceeded. Please try again later (resets every 24 hours).");
        } else {
          setError("Failed to generate study guide. Please try again.");
        }
      });
  };

  const handleGenerate = async () => {
    if (isUploading) return;

    setGeneratedGuide(null);
    setProgress(0);

    const titleHint = file ? file.name.replace(/\.[^/.]+$/, "") : "Custom Revision Blueprint";

    if (file) {
      setIsUploading(true);
      setProgress(5);
      try {
        const textContent = await extractTextFromFile(file);
        triggerGeneration(textContent || notes || "Deep Concept Breakdown", titleHint);
        setState(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            aiUsage: { ...prev.stats.aiUsage, studyGuides: (prev.stats.aiUsage.studyGuides || 0) + 1 }
          }
        }));
      } catch (err) {
        setIsUploading(false);
        console.error("Text extraction failed:", err);
        // Fallback to text reading if extractor fails
        const reader = new FileReader();
        reader.onload = (event) => {
          const textContent = event.target?.result as string;
          triggerGeneration(textContent || notes || "Deep Concept Breakdown", titleHint);
          setState(prev => ({
            ...prev,
            stats: {
              ...prev.stats,
              aiUsage: { ...prev.stats.aiUsage, studyGuides: (prev.stats.aiUsage.studyGuides || 0) + 1 }
            }
          }));
        };
        reader.readAsText(file);
      }
    } else {
      triggerGeneration(notes || "Deep Concept Breakdown", titleHint);
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          aiUsage: { ...prev.stats.aiUsage, studyGuides: (prev.stats.aiUsage.studyGuides || 0) + 1 }
        }
      }));
    }
  };

  const handleDownloadHTML = (guide: DetailedStudyGuide) => {
    const blob = new Blob([guide.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${guide.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_study_guide.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Study Guide Generator</h2>
        <HelpButton view="study-guide" />
      </div>
      <p className="text-stone-400">Transform raw notes or syllabus criteria into highly detailed analytical guides and dynamic interactive revision sheets.</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Form Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="text-forge-accent" size={18} />
              Input Study Material
            </h3>
            
            <div 
              className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-forge-accent/50 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                  <span className="text-white text-xs truncate max-w-[150px]">{file.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-red-400"><X size={16}/></button>
                </div>
              ) : (
                <div className="text-stone-400 text-xs">
                  <Upload size={28} className="mx-auto mb-2 opacity-50 text-forge-accent" />
                  Drag & drop text/notes files or click here
                </div>
              )}
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
            </div>

            <textarea 
              className="w-full h-36 bg-white/5 rounded-xl p-4 text-white text-sm border border-white/5 focus:border-white/10 outline-none" 
              placeholder="Or paste your raw syllabus checklists, practice summaries, or custom text here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            
            <button 
              onClick={handleGenerate}
              disabled={(!file && !notes) || isUploading}
              className="w-full py-3.5 bg-forge-accent text-forge-dark rounded-xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isUploading ? <Loader2 className="animate-spin" /> : 'Compile Study Guide'}
            </button>
            <AnimatePresence>
              {isUploading && <ProgressBar progress={progress} />}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Output Column */}
        <div className="lg:col-span-8">
          <div className="glass-card p-6 rounded-2xl border border-white/10 min-h-64 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <h3 className="text-lg font-bold text-white">Active Preview</h3>
                {generatedGuide && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveTab('markdown')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'markdown' ? 'bg-white/10 text-white' : 'text-stone-400 hover:text-white'}`}
                    >
                      Markdown Digest
                    </button>
                    <button 
                      onClick={() => setActiveTab('interactive')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'interactive' ? 'bg-forge-accent text-forge-dark' : 'text-stone-400 hover:text-white'}`}
                    >
                      Interactive Sheet
                    </button>
                    <button 
                      onClick={() => handleDownloadHTML(generatedGuide)}
                      className="p-1 px-3 text-stone-400 hover:text-white border border-white/10 rounded-lg flex items-center gap-1 text-xs font-mono"
                      title="Download HTML Guide File"
                    >
                      <Download size={14} /> Download HTML
                    </button>
                  </div>
                )}
              </div>

              <div className="text-stone-400 min-h-[420px] flex items-center justify-center border border-white/5 rounded-xl bg-stone-900/30 overflow-hidden relative">
                {isUploading ? (
                  <div className="text-center space-y-3">
                    <Loader2 className="animate-spin mx-auto text-forge-accent" size={36} />
                    <p className="text-sm text-stone-300 font-mono">Conducting Unified Academic Compilation...</p>
                  </div>
                ) : error ? (
                  <div className="text-center p-8 text-red-400">
                    <X size={48} className="mx-auto mb-3" />
                    <p className="text-sm font-bold">{error}</p>
                    <button onClick={() => setError(null)} className="mt-4 text-xs underline text-stone-500">Dismiss</button>
                  </div>
                ) : generatedGuide ? (
                  activeTab === 'markdown' ? (
                    <div className="w-full h-[450px] overflow-y-auto p-6 text-left prose prose-invert max-w-none text-stone-200">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{generatedGuide.markdown}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="w-full h-[450px] relative bg-stone-950">
                      <iframe 
                        srcDoc={generatedGuide.htmlContent} 
                        className="w-full h-full border-none"
                        title="Interactive Study Guide"
                        sandbox="allow-scripts"
                      />
                    </div>
                  )
                ) : (
                  <div className="text-center p-8">
                    <BookOpen size={48} className="mx-auto mb-3 opacity-20 text-forge-accent" />
                    <span className="text-stone-500 text-sm">Your notebook-grade custom compilations will materialize here.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Section - Below Component */}
      <div className="border-t border-white/10 pt-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="text-forge-accent" size={20} />
              Interactive Study Gallery
            </h3>
            <p className="text-xs text-stone-500">View and download your generated Study Guides & Revision Sheets.</p>
          </div>
          {gallery.length > 0 && (
            <button 
              onClick={() => { if (confirm("Clear all archived guides?")) setGallery([]); }} 
              className="text-stone-500 hover:text-red-400 text-xs font-mono"
            >
              Clear Archive
            </button>
          )}
        </div>

        {gallery.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-white/5 bg-white/[0.01]">
            <p className="text-stone-500 text-sm">No items in the gallery yet. Click 'Compile Study Guide' above to craft your first study sheet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gallery.map((guide) => (
              <div 
                key={guide.id}
                className="glass-card p-5 rounded-xl border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-stone-400 uppercase tracking-widest">{guide.subject}</span>
                    <span className="text-[10px] text-stone-500 font-mono">{new Date(guide.timestamp).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-white font-bold text-sm block line-clamp-1 group-hover:text-forge-accent transition-colors">{guide.title}</h4>
                  <p className="text-stone-400 text-xs font-mono">{guide.level}</p>
                </div>
                
                <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                  <button 
                    onClick={() => {
                      setPreviewGuide(guide);
                    }}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all"
                  >
                    <Eye size={12} /> Live View
                  </button>
                  <button 
                    onClick={() => setGallery(prev => prev.filter(g => g.id !== guide.id))}
                    className="p-2 bg-red-900/20 text-red-400 hover:text-red-300 rounded-lg transition-transform hover:scale-105"
                    title="Delete Guide"
                  >
                    [x]
                  </button>
                  <button 
                    onClick={() => handleDownloadHTML(guide)}
                    className="p-2 bg-stone-800 text-stone-300 hover:text-white rounded-lg transition-transform hover:scale-105"
                    title="Download Guide"
                  >
                    <Download size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gallery Live View Sandbox Popup Modal */}
      {createPortal(
        <AnimatePresence>
          {previewGuide && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-6"
            >
              <motion.div 
                initial={{ scale: 0.96, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 15 }}
                className="w-full max-w-[96vw] xl:max-w-7xl h-[94vh] bg-stone-900 rounded-3xl overflow-hidden flex flex-col border border-white/10 shadow-2xl shadow-black"
              >
                {/* Modal Top Bar */}
                <div className="p-4 bg-stone-950 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-black text-base line-clamp-1">{previewGuide.title}</h4>
                    <p className="text-xs text-stone-400 font-mono">{previewGuide.subject} • {previewGuide.level}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleDownloadHTML(previewGuide)}
                      className="p-1.5 px-3 bg-forge-accent hover:opacity-90 text-forge-dark rounded-lg flex items-center gap-1.5 text-xs font-black uppercase tracking-wider"
                    >
                      <Download size={14} /> Download Booklet
                    </button>
                    <button 
                      onClick={() => setPreviewGuide(null)}
                      className="p-1 px-3 text-stone-400 hover:text-white border border-white/10 rounded-lg flex items-center gap-1 text-xs"
                    >
                      <X size={16} /> Close Preview
                    </button>
                  </div>
                </div>

                {/* Modal Core Contents Container */}
                <div className="flex-1 bg-stone-950 relative">
                  <iframe 
                    srcDoc={previewGuide.htmlContent} 
                    className="w-full h-full border-none"
                    title="Live Preview Module"
                    sandbox="allow-scripts"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
