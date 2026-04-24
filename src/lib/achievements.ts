import {
  Flame,
  Trophy,
  Sparkles,
  Wallet,
  PiggyBank,
  Calendar,
  Target,
  Award,
  Crown,
  Star,
  Zap,
  TrendingUp,
  CheckCircle2,
  Moon,
  type LucideIcon,
} from "lucide-react";

export type AchievementCategory =
  | "habit"
  | "routine"
  | "finance"
  | "savings"
  | "consistency"
  | "milestone";

export const CATEGORY_META: Record<
  AchievementCategory,
  { label: string; color: string }
> = {
  habit: { label: "অভ্যাস", color: "from-emerald-400 to-teal-500" },
  routine: { label: "রুটিন", color: "from-sky-400 to-indigo-500" },
  finance: { label: "অর্থ", color: "from-amber-400 to-orange-500" },
  savings: { label: "সঞ্চয়", color: "from-pink-400 to-rose-500" },
  consistency: { label: "ধারাবাহিকতা", color: "from-violet-400 to-purple-500" },
  milestone: { label: "মাইলফলক", color: "from-yellow-400 to-amber-500" },
};

export interface AchievementDef {
  id: string;
  category: AchievementCategory;
  title: string;
  description: string;
  icon: LucideIcon;
  /** target value to unlock (e.g. 7 for "7 day streak") */
  target: number;
}

export interface AchievementProgress extends AchievementDef {
  current: number;
  percent: number; // 0-100
  unlocked: boolean;
  unlockedAt: Date | null;
}

export interface AchievementInputs {
  /** longest habit streak across all habits */
  longestHabitStreak: number;
  /** total habit checkins all time */
  totalHabitCheckins: number;
  /** distinct days a habit was checked in */
  distinctHabitDays: number;
  /** earliest habit checkin date (for unlock timestamps) */
  firstHabitDate: Date | null;

  /** total routine completions */
  totalRoutineCompletions: number;
  /** distinct days a routine was completed */
  distinctRoutineDays: number;
  firstRoutineDate: Date | null;

  /** total transactions logged */
  totalTransactions: number;
  /** total income recorded (BDT) */
  totalIncome: number;
  /** total saved = income - expense (positive net) */
  netSavings: number;
  firstTransactionDate: Date | null;

  /** distinct days namaz was tracked (any prayer reminder time set counts as 1) */
  namazSetupDone: boolean;

  /** account age in days */
  accountAgeDays: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Habit streak
  { id: "habit_streak_3", category: "habit", title: "প্রথম ধাপ", description: "৩ দিন টানা অভ্যাস পূরণ", icon: Sparkles, target: 3 },
  { id: "habit_streak_7", category: "habit", title: "এক সপ্তাহের অগ্নি", description: "৭ দিন টানা অভ্যাস পূরণ", icon: Flame, target: 7 },
  { id: "habit_streak_30", category: "habit", title: "মাসজুড়ে অগ্নি", description: "৩০ দিন টানা অভ্যাস", icon: Flame, target: 30 },
  { id: "habit_streak_100", category: "habit", title: "শতদিনের যোদ্ধা", description: "১০০ দিন টানা অভ্যাস", icon: Crown, target: 100 },

  // Routine completion
  { id: "routine_done_10", category: "routine", title: "রুটিন শুরু", description: "১০টি রুটিন সম্পন্ন", icon: CheckCircle2, target: 10 },
  { id: "routine_done_50", category: "routine", title: "রুটিন মাস্টার", description: "৫০টি রুটিন সম্পন্ন", icon: Target, target: 50 },
  { id: "routine_done_200", category: "routine", title: "অপ্রতিরোধ্য", description: "২০০টি রুটিন সম্পন্ন", icon: Trophy, target: 200 },

  // Finance tracking
  { id: "finance_track_5", category: "finance", title: "অর্থ সচেতন", description: "৫টি লেনদেন রেকর্ড করা", icon: Wallet, target: 5 },
  { id: "finance_track_25", category: "finance", title: "হিসাবি", description: "২৫টি লেনদেন রেকর্ড করা", icon: TrendingUp, target: 25 },
  { id: "finance_track_100", category: "finance", title: "অর্থ পন্ডিত", description: "১০০টি লেনদেন রেকর্ড করা", icon: Award, target: 100 },

  // Savings
  { id: "save_1000", category: "savings", title: "প্রথম সঞ্চয়", description: "১,০০০ টাকা নেট সঞ্চয়", icon: PiggyBank, target: 1000 },
  { id: "save_10000", category: "savings", title: "সঞ্চয়ী", description: "১০,০০০ টাকা নেট সঞ্চয়", icon: PiggyBank, target: 10000 },
  { id: "save_50000", category: "savings", title: "বিনিয়োগকারী", description: "৫০,০০০ টাকা নেট সঞ্চয়", icon: Star, target: 50000 },

  // Consistency
  { id: "consistency_7", category: "consistency", title: "এক সপ্তাহ", description: "৭ দিন অ্যাপে সক্রিয়", icon: Calendar, target: 7 },
  { id: "consistency_30", category: "consistency", title: "এক মাস", description: "৩০ দিন অ্যাপে সক্রিয়", icon: Calendar, target: 30 },
  { id: "consistency_90", category: "consistency", title: "ত্রৈমাসিক", description: "৯০ দিন অ্যাপে সক্রিয়", icon: Zap, target: 90 },

  // Special milestones
  { id: "milestone_namaz", category: "milestone", title: "ইমান", description: "নামাযের সময় সেট আপ সম্পন্ন", icon: Moon, target: 1 },
  { id: "milestone_first_habit", category: "milestone", title: "যাত্রা শুরু", description: "প্রথম অভ্যাস তৈরি", icon: Sparkles, target: 1 },
  { id: "milestone_first_routine", category: "milestone", title: "পরিকল্পক", description: "প্রথম রুটিন সম্পন্ন", icon: CheckCircle2, target: 1 },
];

export const computeAchievements = (i: AchievementInputs): AchievementProgress[] => {
  const map: Record<string, { current: number; refDate: Date | null }> = {
    habit_streak_3: { current: i.longestHabitStreak, refDate: i.firstHabitDate },
    habit_streak_7: { current: i.longestHabitStreak, refDate: i.firstHabitDate },
    habit_streak_30: { current: i.longestHabitStreak, refDate: i.firstHabitDate },
    habit_streak_100: { current: i.longestHabitStreak, refDate: i.firstHabitDate },
    routine_done_10: { current: i.totalRoutineCompletions, refDate: i.firstRoutineDate },
    routine_done_50: { current: i.totalRoutineCompletions, refDate: i.firstRoutineDate },
    routine_done_200: { current: i.totalRoutineCompletions, refDate: i.firstRoutineDate },
    finance_track_5: { current: i.totalTransactions, refDate: i.firstTransactionDate },
    finance_track_25: { current: i.totalTransactions, refDate: i.firstTransactionDate },
    finance_track_100: { current: i.totalTransactions, refDate: i.firstTransactionDate },
    save_1000: { current: Math.max(0, i.netSavings), refDate: i.firstTransactionDate },
    save_10000: { current: Math.max(0, i.netSavings), refDate: i.firstTransactionDate },
    save_50000: { current: Math.max(0, i.netSavings), refDate: i.firstTransactionDate },
    consistency_7: { current: i.accountAgeDays, refDate: null },
    consistency_30: { current: i.accountAgeDays, refDate: null },
    consistency_90: { current: i.accountAgeDays, refDate: null },
    milestone_namaz: { current: i.namazSetupDone ? 1 : 0, refDate: null },
    milestone_first_habit: { current: Math.min(1, i.totalHabitCheckins), refDate: i.firstHabitDate },
    milestone_first_routine: { current: Math.min(1, i.totalRoutineCompletions), refDate: i.firstRoutineDate },
  };

  return ACHIEVEMENTS.map((def) => {
    const m = map[def.id] ?? { current: 0, refDate: null };
    const current = m.current;
    const unlocked = current >= def.target;
    const percent = Math.min(100, Math.round((current / def.target) * 100));
    return {
      ...def,
      current,
      percent,
      unlocked,
      unlockedAt: unlocked ? m.refDate : null,
    };
  });
};