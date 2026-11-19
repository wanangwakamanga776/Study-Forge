import React, { useState } from 'react';
import { Layers, Plus, BookOpen, FileText, Globe, Sparkles, FolderPlus, ArrowRight } from 'lucide-react';
import { AppState } from '../types';
import { PageHeader } from '../components/layout/PageHeader';

interface ForgeStudioPageProps {
  state: AppState;
  onOpenForge: (topic?: string) => void;
  onNavigate: (view: string) => void;
}

export function ForgeStudioPage({ state, onOpenForge, onNavigate }: ForgeStudioPageProps) {
  const [creationMode, setCreationMode] = useState<'topic' | 'material' | 'multi'>('topic');
  const [topicInput, setTopicInput] = useState('');
  const [level, setLevel] = useState('High School / GCSE');

  const handleCreateTopicForge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) return;
    onOpenForge(topicInput.trim());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forge Studio"
        description="Create, manage, and customize your persistent learning environments."
        action={
          <button type="button" className="sf-btn sf-btn-primary" onClick={() => onOpenForge()}>
            <Plus aria-hidden="true" size={16} /> New Forge
          </button>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setCreationMode('topic')}
          className={`sf-card p-6 text-left transition-all ${
            creationMode === 'topic' ? 'border-[var(--sf-orange-500)] bg-white/[0.04]' : 'hover:border-white/20'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sf-orange-500)]/15 text-[var(--sf-orange-400)]">
            <Sparkles size={20} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">Topic-Based</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--sf-text-subtle)]">
            Enter any subject or prompt. AI builds an entire course with lessons, cards, and quizzes.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setCreationMode('material')}
          className={`sf-card p-6 text-left transition-all ${
            creationMode === 'material' ? 'border-[var(--sf-orange-500)] bg-white/[0.04]' : 'hover:border-white/20'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sf-orange-500)]/15 text-[var(--sf-orange-400)]">
            <FileText size={20} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">Material-Based</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--sf-text-subtle)]">
            Upload PDFs, lecture notes, or textbooks to extract structured units and questions.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setCreationMode('multi')}
          className={`sf-card p-6 text-left transition-all ${
            creationMode === 'multi' ? 'border-[var(--sf-orange-500)] bg-white/[0.04]' : 'hover:border-white/20'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sf-orange-500)]/15 text-[var(--sf-orange-400)]">
            <FolderPlus size={20} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">Multi-Source</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--sf-text-subtle)]">
            Combine multiple documents, syllabus guidelines, and web links into one master Forge.
          </p>
        </button>
      </div>

      {creationMode === 'topic' && (
        <form onSubmit={handleCreateTopicForge} className="sf-card p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-semibold text-white">Create Topic-Based Forge</h3>
          <div>
            <label className="block text-xs font-medium text-[var(--sf-text-subtle)] uppercase tracking-wider mb-2">
              Topic or Subject
            </label>
            <input
              type="text"
              placeholder="e.g. Organic Chemistry, US History 1860-1865, AP Bio Cell Communication"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              className="w-full rounded-xl border border-[var(--sf-border)] bg-black/40 px-4 py-3 text-sm text-white placeholder-[var(--sf-text-subtle)] focus:border-[var(--sf-orange-500)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--sf-text-subtle)] uppercase tracking-wider mb-2">
              Target Educational Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-xl border border-[var(--sf-border)] bg-[#141210] px-4 py-3 text-sm text-white focus:border-[var(--sf-orange-500)] focus:outline-none"
            >
              <option value="High School / GCSE">High School / GCSE</option>
              <option value="AP / A-Level">AP / A-Level / IB</option>
              <option value="University / College Intro">University / College Intro</option>
              <option value="Advanced / Graduate">Advanced / Professional</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!topicInput.trim()}
            className="sf-btn sf-btn-primary w-full sm:w-auto min-h-11 px-6 font-semibold"
          >
            Generate Forge Blueprint <ArrowRight size={16} />
          </button>
        </form>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Your Active Forges & Lessons</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(state.lessons || []).map((lesson) => (
            <div
              key={lesson.id}
              className="sf-card p-5 flex flex-col justify-between space-y-4 hover:border-white/20 transition-all cursor-pointer"
              onClick={() => onNavigate('lessons')}
            >
              <div>
                <span className="sf-chip text-[10px] uppercase font-semibold text-[var(--sf-orange-300)]">
                  {lesson.audit_metadata?.level_detected || 'Course'}
                </span>
                <h4 className="mt-2 font-semibold text-white text-base leading-snug">
                  {lesson.audit_metadata?.title || 'Untitled Forge'}
                </h4>
                <p className="mt-1 text-xs text-[var(--sf-text-subtle)] line-clamp-2">
                  {lesson.semantic_map?.central_thesis || 'Interactive study environment ready.'}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--sf-text-muted)] border-t border-white/5 pt-3">
                <span>{lesson.completed_sessions_count || 0} sessions done</span>
                <span className="text-[var(--sf-orange-400)] font-medium">Study &rarr;</span>
              </div>
            </div>
          ))}
          {(!state.lessons || state.lessons.length === 0) && (
            <div className="col-span-full sf-card p-12 text-center text-sm text-[var(--sf-text-subtle)] border-dashed">
              No Forges created yet. Use the form above to generate your first study environment!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}