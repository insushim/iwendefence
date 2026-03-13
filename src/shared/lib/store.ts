import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  GameState,
  GameActions,
  GameSpeed,
  Tower,
  TowerGrade,
  Enemy,
  Quiz,
  QuizReward,
  RoguelikeUpgrade,
  PlayerProgress,
  PlayerActions,
  WordStat,
  MasteryLevel,
  WordData,
  WordGrade,
  QuizType,
  SettingsState,
  SettingsActions,
  StageKey,
  WorldId,
  StageId,
} from '../types/game';

// ============================================================
// Initial States
// ============================================================

const initialGameState: GameState = {
  gold: 100,
  diamonds: 0,
  hp: 20,
  maxHp: 20,
  wave: 0,
  towers: [],
  enemies: [],
  score: 0,
  combo: 0,
  quizCombo: 0,
  speed: 1,
  isPaused: false,
  isGameOver: false,
  currentHero: null,
};

const initialPlayerProgress: PlayerProgress = {
  unlockedStages: [{ worldId: 1, stageId: 1 }],
  heroes: [],
  upgrades: [],
  wordStats: [],
  highScores: {},
};

const initialSettingsState: SettingsState = {
  volume: 0.7,
  sfxVolume: 0.8,
  grade: 3,
  difficulty: 1,
  language: 'ko',
};

// ============================================================
// 1. useGameStore - Current game state management
// ============================================================

interface GameStore extends GameState, GameActions {
  currentQuiz: Quiz | null;
}

export const useGameStore = create<GameStore>()(
  immer((set) => ({
    ...initialGameState,
    currentQuiz: null,

    // ── Gold ───────────────────────────────────────────────
    setGold: (gold: number) =>
      set((state) => {
        state.gold = Math.max(0, gold);
      }),

    addGold: (amount: number) =>
      set((state) => {
        state.gold = Math.max(0, state.gold + amount);
      }),

    // ── HP ─────────────────────────────────────────────────
    setHp: (hp: number) =>
      set((state) => {
        state.hp = Math.max(0, Math.min(hp, state.maxHp));
      }),

    takeDamage: (amount: number) =>
      set((state) => {
        state.hp = Math.max(0, state.hp - amount);
        if (state.hp <= 0) {
          state.isGameOver = true;
        }
      }),

    healHp: (amount: number) =>
      set((state) => {
        state.hp = Math.min(state.maxHp, state.hp + amount);
      }),

    // ── Tower ──────────────────────────────────────────────
    addTower: (tower: Tower) =>
      set((state) => {
        state.towers.push(tower);
      }),

    removeTower: (towerId: string) =>
      set((state) => {
        const idx = state.towers.findIndex((t) => t.id === towerId);
        if (idx !== -1) {
          state.towers.splice(idx, 1);
        }
      }),

    upgradeTower: (towerId: string) =>
      set((state) => {
        const tower = state.towers.find((t) => t.id === towerId);
        if (!tower) return;

        tower.level += 1;
        // Scale stats by 15% per level
        const scale = 1.15;
        tower.stats.damage = Math.round(tower.stats.damage * scale);
        tower.stats.range = +(tower.stats.range * 1.02).toFixed(2);
        tower.stats.attackSpeed = +(tower.stats.attackSpeed * 1.05).toFixed(3);
        tower.stats.critChance = Math.min(1, +(tower.stats.critChance + 0.01).toFixed(2));
        tower.stats.critDamage = +(tower.stats.critDamage + 0.05).toFixed(2);
      }),

    mergeTowers: (sourceId: string, targetId: string) =>
      set((state) => {
        const source = state.towers.find((t) => t.id === sourceId);
        const target = state.towers.find((t) => t.id === targetId);
        if (!source || !target) return;
        if (source.type !== target.type || source.grade !== target.grade) return;

        // Upgrade target grade (cap at MYTHIC = 5)
        const newGrade = Math.min(5, target.grade + 1) as TowerGrade;
        target.grade = newGrade;
        target.mergeCount += 1;

        // Boost stats from merge
        const mergeScale = 1.5;
        target.stats.damage = Math.round(target.stats.damage * mergeScale);
        target.stats.range = +(target.stats.range * 1.1).toFixed(2);
        target.stats.attackSpeed = +(target.stats.attackSpeed * 1.15).toFixed(3);
        target.stats.critChance = Math.min(1, +(target.stats.critChance + 0.03).toFixed(2));
        target.stats.critDamage = +(target.stats.critDamage + 0.2).toFixed(2);

        // Remove source tower
        const sourceIdx = state.towers.findIndex((t) => t.id === sourceId);
        if (sourceIdx !== -1) {
          state.towers.splice(sourceIdx, 1);
        }
      }),

    // ── Enemy ──────────────────────────────────────────────
    spawnEnemy: (enemy: Enemy) =>
      set((state) => {
        state.enemies.push(enemy);
      }),

    damageEnemy: (enemyId: string, damage: number) =>
      set((state) => {
        const enemy = state.enemies.find((e) => e.id === enemyId);
        if (!enemy) return;
        enemy.hp = Math.max(0, enemy.hp - damage);
      }),

    removeEnemy: (enemyId: string) =>
      set((state) => {
        const idx = state.enemies.findIndex((e) => e.id === enemyId);
        if (idx !== -1) {
          state.enemies.splice(idx, 1);
        }
      }),

    // ── Wave ───────────────────────────────────────────────
    nextWave: () =>
      set((state) => {
        state.wave += 1;
      }),

    setSpeed: (speed: GameSpeed) =>
      set((state) => {
        state.speed = speed;
      }),

    togglePause: () =>
      set((state) => {
        state.isPaused = !state.isPaused;
      }),

    // ── Combo ──────────────────────────────────────────────
    setCombo: (combo: number) =>
      set((state) => {
        state.combo = combo;
      }),

    resetCombo: () =>
      set((state) => {
        state.combo = 0;
        state.quizCombo = 0;
      }),

    incrementCombo: () =>
      set((state) => {
        state.combo += 1;
        state.quizCombo += 1;
      }),

    // ── Quiz ───────────────────────────────────────────────
    startQuiz: (quiz: Quiz) =>
      set((state) => {
        state.currentQuiz = quiz;
        state.isPaused = true;
      }),

    completeQuiz: (correct: boolean, reward: QuizReward) =>
      set((state) => {
        state.currentQuiz = null;
        state.isPaused = false;

        if (correct) {
          state.quizCombo += 1;
          state.combo += 1;

          // Apply quiz rewards
          const comboMultiplier = 1 + state.quizCombo * 0.1;
          state.gold += Math.round(50 * reward.goldMultiplier * comboMultiplier);
          state.score += Math.round(100 * comboMultiplier);
        } else {
          state.quizCombo = 0;
        }
      }),

    // ── Upgrade ────────────────────────────────────────────
    applyUpgrade: (upgrade: RoguelikeUpgrade) =>
      set((state) => {
        const { effect } = upgrade;

        // Apply global effects based on category
        switch (upgrade.category) {
          case 'economy':
            if (effect.stat === 'gold') {
              if (effect.operation === 'add') state.gold += effect.value;
              else if (effect.operation === 'multiply') state.gold = Math.round(state.gold * effect.value);
            }
            break;
          case 'defense':
            if (effect.stat === 'maxHp') {
              if (effect.operation === 'add') {
                state.maxHp += effect.value;
                state.hp += effect.value;
              } else if (effect.operation === 'multiply') {
                const oldMax = state.maxHp;
                state.maxHp = Math.round(state.maxHp * effect.value);
                state.hp += state.maxHp - oldMax;
              }
            }
            break;
          case 'tower':
            // Apply stat boost to all towers
            for (const tower of state.towers) {
              if (effect.stat === 'damage') {
                if (effect.operation === 'add') tower.stats.damage += effect.value;
                else if (effect.operation === 'multiply') tower.stats.damage = Math.round(tower.stats.damage * effect.value);
              } else if (effect.stat === 'attackSpeed') {
                if (effect.operation === 'add') tower.stats.attackSpeed += effect.value;
                else if (effect.operation === 'multiply') tower.stats.attackSpeed *= effect.value;
              } else if (effect.stat === 'range') {
                if (effect.operation === 'add') tower.stats.range += effect.value;
                else if (effect.operation === 'multiply') tower.stats.range *= effect.value;
              } else if (effect.stat === 'critChance') {
                if (effect.operation === 'add') tower.stats.critChance = Math.min(1, tower.stats.critChance + effect.value);
              } else if (effect.stat === 'critDamage') {
                if (effect.operation === 'add') tower.stats.critDamage += effect.value;
              }
            }
            break;
          // word and special categories are handled by game logic externally
          default:
            break;
        }

        state.score += 50; // bonus score for picking upgrade
      }),

    // ── Game Over ──────────────────────────────────────────
    setGameOver: () =>
      set((state) => {
        state.isGameOver = true;
        state.isPaused = true;
      }),

    // ── Reset ──────────────────────────────────────────────
    reset: () =>
      set((state) => {
        Object.assign(state, { ...initialGameState, currentQuiz: null });
      }),
  }))
);

// ============================================================
// 2. usePlayerStore - Permanent progress (persisted)
// ============================================================

interface PlayerStore extends PlayerProgress, PlayerActions {}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    immer((set, get) => ({
      ...initialPlayerProgress,

      unlockStage: (worldId: WorldId, stageId: StageId) =>
        set((state) => {
          const exists = state.unlockedStages.some(
            (s: StageKey) => s.worldId === worldId && s.stageId === stageId
          );
          if (!exists) {
            state.unlockedStages.push({ worldId, stageId });
          }
        }),

      setHighScore: (worldId: WorldId, stageId: StageId, score: number) =>
        set((state) => {
          const key = `${worldId}-${stageId}`;
          const current = state.highScores[key] ?? 0;
          if (score > current) {
            state.highScores[key] = score;
          }
        }),

      addWordStat: (stat: WordStat) =>
        set((state) => {
          const existing = state.wordStats.find((ws: WordStat) => ws.wordId === stat.wordId);
          if (!existing) {
            state.wordStats.push(stat);
          }
        }),

      updateWordStat: (wordId: string, correct: boolean, responseTime: number) =>
        set((state) => {
          const stat = state.wordStats.find((ws: WordStat) => ws.wordId === wordId);
          if (!stat) {
            // Create a new stat entry
            const newStat: WordStat = {
              wordId,
              totalAttempts: 1,
              correctCount: correct ? 1 : 0,
              wrongCount: correct ? 0 : 1,
              lastAttempted: Date.now(),
              mastery: 0 as MasteryLevel,
              streak: correct ? 1 : 0,
              averageResponseTime: responseTime,
            };
            state.wordStats.push(newStat);
            return;
          }

          stat.totalAttempts += 1;
          stat.lastAttempted = Date.now();

          if (correct) {
            stat.correctCount += 1;
            stat.streak += 1;

            // Mastery increases on streaks: 3->1, 6->2, 10->3, 15->4, 21->5
            const thresholds = [3, 6, 10, 15, 21];
            for (let i = thresholds.length - 1; i >= 0; i--) {
              if (stat.streak >= thresholds[i]) {
                stat.mastery = Math.min(5, i + 1) as MasteryLevel;
                break;
              }
            }
          } else {
            stat.wrongCount += 1;
            stat.streak = 0;
            // Mastery decreases on wrong answer (min 0)
            stat.mastery = Math.max(0, stat.mastery - 1) as MasteryLevel;
          }

          // Running average response time
          stat.averageResponseTime = Math.round(
            (stat.averageResponseTime * (stat.totalAttempts - 1) + responseTime) /
              stat.totalAttempts
          );
        }),

      unlockHero: (heroId: string) =>
        set((state) => {
          const hero = state.heroes.find((h) => h.heroId === heroId);
          if (hero) {
            hero.unlocked = true;
          } else {
            state.heroes.push({
              heroId,
              unlocked: true,
              level: 1,
              experience: 0,
            });
          }
        }),

      upgradeHero: (heroId: string) =>
        set((state) => {
          const hero = state.heroes.find((h) => h.heroId === heroId);
          if (hero && hero.unlocked) {
            hero.level += 1;
          }
        }),

      saveProgress: () => {
        // persist middleware handles this automatically
        // this is a manual trigger for explicit save points
        const state = get();
        try {
          localStorage.setItem(
            'wordguard-player-backup',
            JSON.stringify({
              unlockedStages: state.unlockedStages,
              heroes: state.heroes,
              upgrades: state.upgrades,
              wordStats: state.wordStats,
              highScores: state.highScores,
              savedAt: Date.now(),
            })
          );
        } catch {
          // localStorage may not be available (SSR)
        }
      },

      loadProgress: () => {
        try {
          const backup = localStorage.getItem('wordguard-player-backup');
          if (!backup) return;

          const data = JSON.parse(backup) as PlayerProgress;
          set((state) => {
            state.unlockedStages = data.unlockedStages ?? state.unlockedStages;
            state.heroes = data.heroes ?? state.heroes;
            state.upgrades = data.upgrades ?? state.upgrades;
            state.wordStats = data.wordStats ?? state.wordStats;
            state.highScores = data.highScores ?? state.highScores;
          });
        } catch {
          // localStorage may not be available (SSR)
        }
      },
    })),
    {
      name: 'wordguard-player',
    }
  )
);

// ============================================================
// 3. useWordStore - Word data management
// ============================================================

interface WordStore {
  words: WordData[];
  filteredWords: WordData[];
  setWords: (words: WordData[]) => void;
  getWordsByGrade: (grade: WordGrade) => WordData[];
  getWordsByCategory: (category: string) => WordData[];
  getQuizWord: (wordStats: WordStat[]) => WordData | null;
  generateQuiz: (type: QuizType, wordStats: WordStat[]) => Quiz | null;
}

export const useWordStore = create<WordStore>()(
  immer((set, get) => ({
    words: [],
    filteredWords: [],

    setWords: (words: WordData[]) =>
      set((state) => {
        state.words = words;
        state.filteredWords = words;
      }),

    getWordsByGrade: (grade: WordGrade): WordData[] => {
      return get().words.filter((w) => w.grade === grade);
    },

    getWordsByCategory: (category: string): WordData[] => {
      return get().words.filter((w) => w.category === category);
    },

    /**
     * Spaced repetition word selection:
     * - Words with lower mastery appear more frequently
     * - Words not attempted recently get priority
     * - New words (no stat) are mixed in
     */
    getQuizWord: (wordStats: WordStat[]): WordData | null => {
      const { words } = get();
      if (words.length === 0) return null;

      const statMap = new Map<string, WordStat>();
      for (const ws of wordStats) {
        statMap.set(ws.wordId, ws);
      }

      // Calculate weight for each word
      const weighted: { word: WordData; weight: number }[] = words.map((word) => {
        const stat = statMap.get(word.id);

        if (!stat) {
          // New word - high priority
          return { word, weight: 10 };
        }

        // Lower mastery = higher weight
        const masteryWeight = (6 - stat.mastery) * 2;

        // Time decay: words not seen recently get boosted
        const hoursSinceAttempt = (Date.now() - stat.lastAttempted) / (1000 * 60 * 60);
        const timeWeight = Math.min(5, hoursSinceAttempt / 24); // caps at 5 after 5 days

        // Wrong answers boost weight
        const errorWeight = stat.wrongCount > 0 ? (stat.wrongCount / stat.totalAttempts) * 3 : 0;

        return { word, weight: masteryWeight + timeWeight + errorWeight };
      });

      // Weighted random selection
      const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
      let random = Math.random() * totalWeight;

      for (const item of weighted) {
        random -= item.weight;
        if (random <= 0) {
          return item.word;
        }
      }

      // Fallback
      return weighted[weighted.length - 1]?.word ?? null;
    },

    /**
     * Generate a quiz of the given type using spaced repetition
     */
    generateQuiz: (type: QuizType, wordStats: WordStat[]): Quiz | null => {
      const state = get();
      const targetWord = state.getQuizWord(wordStats);
      if (!targetWord) return null;

      const { words } = state;

      // Generate wrong options (3 distractors)
      const isEnglishAnswer = type === 'kr2en' || type === 'spelling';
      const correctAnswer = isEnglishAnswer ? targetWord.english : targetWord.korean;

      const distractors: string[] = [];
      const pool = words.filter((w) => w.id !== targetWord.id);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);

      for (const w of shuffled) {
        if (distractors.length >= 3) break;
        const candidate = isEnglishAnswer ? w.english : w.korean;
        if (candidate && candidate !== correctAnswer && !distractors.includes(candidate)) {
          distractors.push(candidate);
        }
      }

      // Ensure exactly 4 options with correct answer always included
      const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
      if (!options.includes(correctAnswer)) {
        options[0] = correctAnswer;
      }

      // Time limits per quiz type
      const timeLimits: Record<QuizType, number> = {
        kr2en: 10,
        en2kr: 10,
        listening: 12,
        spelling: 15,
        sentence: 20,
        image: 10,
        combo: 8,
      };

      // Rewards scale with combo type difficulty
      const rewardMultipliers: Record<QuizType, number> = {
        kr2en: 1.0,
        en2kr: 1.0,
        listening: 1.2,
        spelling: 1.5,
        sentence: 2.0,
        image: 1.0,
        combo: 2.5,
      };

      const multiplier = rewardMultipliers[type];

      const quiz: Quiz = {
        type,
        word: targetWord,
        options,
        timeLimit: timeLimits[type],
        reward: {
          goldMultiplier: multiplier,
          attackBoost: type === 'combo' ? 0.3 : 0.1,
          ultimateCharge: type === 'sentence' ? 0.15 : 0.05,
          invincible: type === 'combo' ? 2 : 0,
          speedBoost: type === 'spelling' ? 0.2 : 0,
        },
      };

      return quiz;
    },
  }))
);

// ============================================================
// 4. useSettingsStore - Settings (persisted)
// ============================================================

interface SettingsStore extends SettingsState, SettingsActions {}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    immer((set) => ({
      ...initialSettingsState,

      setVolume: (volume: number) =>
        set((state) => {
          state.volume = Math.max(0, Math.min(1, volume));
        }),

      setSfxVolume: (sfxVolume: number) =>
        set((state) => {
          state.sfxVolume = Math.max(0, Math.min(1, sfxVolume));
        }),

      setGrade: (grade) =>
        set((state) => {
          state.grade = grade;
        }),

      setDifficulty: (difficulty) =>
        set((state) => {
          state.difficulty = difficulty;
        }),

      setLanguage: (language) =>
        set((state) => {
          state.language = language;
        }),
    })),
    {
      name: 'wordguard-settings',
    }
  )
);
