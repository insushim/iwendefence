'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Star,
  Filter,
  BookOpen,
  Volume2,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { usePlayerStore, useWordStore } from '@/shared/lib/store';
import type { WordGrade, MasteryLevel, WordData } from '@/shared/types/game';
import ProgressBar from '@/shared/ui/ProgressBar';
import Modal from '@/shared/ui/Modal';

const gradeFilters: { value: WordGrade | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 3, label: '3학년' },
  { value: 4, label: '4학년' },
  { value: 5, label: '5학년' },
  { value: 6, label: '6학년' },
];

const masteryFilters: { value: MasteryLevel | 'all'; label: string; color: string }[] = [
  { value: 'all', label: '전체', color: 'text-slate-400' },
  { value: 0, label: '미학습', color: 'text-slate-500' },
  { value: 1, label: '시작', color: 'text-red-400' },
  { value: 2, label: '학습중', color: 'text-amber-400' },
  { value: 3, label: '익숙함', color: 'text-emerald-400' },
  { value: 4, label: '숙련', color: 'text-blue-400' },
  { value: 5, label: '마스터', color: 'text-purple-400' },
];

function MasteryStars({ level }: { level: MasteryLevel }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i < level ? 'text-amber-400' : 'text-slate-700'
          }`}
          fill={i < level ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
}

export default function WordbookPage() {
  const words = useWordStore((s) => s.words);
  const wordStats = usePlayerStore((s) => s.wordStats);

  const [gradeFilter, setGradeFilter] = useState<WordGrade | 'all'>('all');
  const [masteryFilter, setMasteryFilter] = useState<MasteryLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState<WordData | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const statMap = useMemo(() => {
    const map = new Map<string, (typeof wordStats)[0]>();
    for (const ws of wordStats) {
      map.set(ws.wordId, ws);
    }
    return map;
  }, [wordStats]);

  const filteredWords = useMemo(() => {
    let result = words;

    if (gradeFilter !== 'all') {
      result = result.filter((w) => w.grade === gradeFilter);
    }

    if (masteryFilter !== 'all') {
      result = result.filter((w) => {
        const stat = statMap.get(w.id);
        return stat ? stat.mastery === masteryFilter : masteryFilter === 0;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (w) =>
          w.english.toLowerCase().includes(q) ||
          w.korean.includes(q)
      );
    }

    return result;
  }, [words, gradeFilter, masteryFilter, searchQuery, statMap]);

  // Overall stats
  const totalWords = words.length;
  const learnedWords = wordStats.filter((ws) => ws.mastery >= 1).length;
  const masteredWords = wordStats.filter((ws) => ws.mastery >= 4).length;
  const totalAccuracy =
    wordStats.length > 0
      ? Math.round(
          (wordStats.reduce((sum, ws) => sum + ws.correctCount, 0) /
            Math.max(1, wordStats.reduce((sum, ws) => sum + ws.totalAttempts, 0))) *
            100
        )
      : 0;

  return (
    <div className="min-h-dvh bg-[#0F172A]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </motion.div>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              단어장
            </h1>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              showFilters ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50">
            <p className="text-2xl font-black text-white">{learnedWords}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">학습한 단어</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50">
            <p className="text-2xl font-black text-purple-400">{masteredWords}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">마스터</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50">
            <p className="text-2xl font-black text-emerald-400">{totalAccuracy}%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">정답률</p>
          </div>
        </div>

        {/* Overall Progress */}
        <ProgressBar
          value={learnedWords}
          max={Math.max(1, totalWords)}
          color="bg-gradient-to-r from-emerald-500 to-teal-400"
          label="전체 진행률"
          showLabel
        />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="단어 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">학년</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {gradeFilters.map((f) => (
                      <button
                        key={String(f.value)}
                        onClick={() => setGradeFilter(f.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          gradeFilter === f.value
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">숙련도</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {masteryFilters.map((f) => (
                      <button
                        key={String(f.value)}
                        onClick={() => setMasteryFilter(f.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          masteryFilter === f.value
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Word Count */}
        <p className="text-xs text-slate-500">
          {filteredWords.length}개의 단어
        </p>

        {/* Word Grid */}
        {filteredWords.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredWords.map((word, index) => {
              const stat = statMap.get(word.id);
              const mastery = (stat?.mastery ?? 0) as MasteryLevel;

              return (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.5) }}
                >
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedWord(word)}
                    className="w-full bg-slate-800/50 rounded-xl p-3 text-left border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                  >
                    <p className="font-bold text-white text-sm truncate">
                      {word.english}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {word.korean}
                    </p>
                    <div className="mt-2">
                      <MasteryStars level={mastery} />
                    </div>
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-600 text-sm">
              {words.length === 0
                ? '단어 데이터를 불러오는 중...'
                : '검색 결과가 없습니다'}
            </p>
          </div>
        )}
      </div>

      {/* Word Detail Modal */}
      <Modal
        isOpen={selectedWord !== null}
        onClose={() => setSelectedWord(null)}
        showCloseButton
      >
        {selectedWord && (
          <div className="bg-slate-800 rounded-3xl p-6 w-80 border border-slate-700">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black text-white">
                {selectedWord.english}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {selectedWord.phonetic}
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-900/50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">뜻</p>
                <p className="text-white font-medium">{selectedWord.korean}</p>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">품사</p>
                <p className="text-white text-sm">{selectedWord.partOfSpeech}</p>
              </div>

              {selectedWord.exampleSentence && (
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">예문</p>
                  <p className="text-white text-sm">{selectedWord.exampleSentence}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedWord.exampleKorean}
                  </p>
                </div>
              )}

              <div className="bg-slate-900/50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">숙련도</p>
                <MasteryStars
                  level={(statMap.get(selectedWord.id)?.mastery ?? 0) as MasteryLevel}
                />
                {statMap.get(selectedWord.id) && (
                  <div className="flex gap-4 mt-2 text-xs text-slate-400">
                    <span>
                      정답: {statMap.get(selectedWord.id)!.correctCount}
                    </span>
                    <span>
                      오답: {statMap.get(selectedWord.id)!.wrongCount}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300">
                  {selectedWord.grade}학년
                </span>
                <span className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-400">
                  {selectedWord.category}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
