import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Download, Printer, Upload, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { HelpButton } from './HelpSystem';
import { ProgressBar } from './ProgressBar';

export const StudyGuideViewer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState('');
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleGenerate = () => {
    setIsUploading(true);
    setGeneratedContent(null);
    setProgress(0);
    
    // Simulate generation steps for realism
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) {
        clearInterval(interval);
        setProgress(100);
        setIsUploading(false);
        setGeneratedContent(`# Generated Study Guide\n\n## Key Concepts\n- Concept 1: Description of core principle.\n- Concept 2: Explanation of secondary theory.\n\n## Summary\nThis guide summarizes the provided material for quick review.\n\nKeep focusing on the core principles!`);
      } else {
        setProgress(Math.min(100, Math.floor(p)));
      }
    }, 300);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Study Guide Generator</h2>
        <HelpButton view="study-guide" />
      </div>
      <p className="text-stone-500">Transform your notes and materials into premium study guides.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <h3 className="text-xl font-bold text-white mb-2">Input Material</h3>
          
          <div 
            className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-forge-accent/50 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                <span className="text-white text-sm truncate">{file.name}</span>
                <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-red-400"><X size={16}/></button>
              </div>
            ) : (
              <div className="text-stone-400">
                <Upload size={32} className="mx-auto mb-2 opacity-50" />
                Drag & drop files or click to upload
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          </div>

          <textarea 
            className="w-full h-40 bg-white/5 rounded-xl p-4 text-white text-sm" 
            placeholder="Or paste your raw notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          
          <button 
            onClick={handleGenerate}
            disabled={(!file && !notes) || isUploading}
            className="w-full py-4 bg-forge-accent text-forge-dark rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isUploading ? <Loader2 className="animate-spin" /> : 'Generate Study Guide'}
          </button>
          <AnimatePresence>
            {isUploading && <ProgressBar progress={progress} />}
          </AnimatePresence>
        </div>
        
        <div className="glass-card p-6 rounded-2xl border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4">Study Guide Preview</h3>
          <div className="text-stone-400 min-h-64 flex items-center justify-center border border-white/5 rounded-xl p-4">
            {isUploading ? (
              <div className="text-center">
                <Loader2 className="animate-spin mx-auto mb-2" />
                Processing material...
              </div>
            ) : generatedContent ? (
              <div className="w-full prose prose-invert markdown-content overflow-y-auto max-h-[500px]">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{generatedContent}</ReactMarkdown>
              </div>
            ) : 'Preview will appear here after generation...'}
          </div>
        </div>
      </div>
    </div>
  );
};
