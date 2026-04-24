const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export const toBn = (n: number | string) =>
  String(n).replace(/\d/g, (d) => BN_DIGITS[+d]);

export const BN_DAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
export const BN_DAYS_FULL = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
export const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

export const formatBnDate = (d: Date) =>
  `${toBn(d.getDate())} ${BN_MONTHS[d.getMonth()]}, ${toBn(d.getFullYear())}`;

export const formatBnDateShort = (d: Date) =>
  `${toBn(d.getDate())} ${BN_MONTHS[d.getMonth()].slice(0, 3)}`;

export const formatBnTime = (time: string | null | undefined) => {
  if (!time) return null;
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${toBn(displayHour)}:${toBn(m)} ${period}`;
};

export const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const daysBetween = (a: Date, b: Date) =>
  Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

/**
 * Calculate current streak (consecutive days from today going back).
 * Accepts a sorted (desc) array of YYYY-MM-DD date strings.
 */
export const calcStreak = (dates: string[]): number => {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Allow today to not be checked-in yet — start from today, but if today missing, start from yesterday
  const start = set.has(toLocalDateStr(today)) ? 0 : 1;
  for (let i = start; ; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (set.has(toLocalDateStr(d))) streak++;
    else break;
  }
  return streak;
};

export const calcLongestStreak = (dates: string[]): number => {
  if (!dates.length) return 0;
  const sorted = [...new Set(dates)].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    if (daysBetween(curr, prev) === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
};