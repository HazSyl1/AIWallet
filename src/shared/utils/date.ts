// Date utility functions

/**
 * Parse various date formats to ISO string
 * Handles:
 * - "today", "yesterday", "tomorrow"
 * - "2 days ago", "last week"
 * - "25th August", "Aug 25"
 * - "25/08/2026", "2026-08-25"
 */
export const parseDateToISO = (input: string): string | null => {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const normalized = input.toLowerCase().trim();
  const now = new Date();

  // Relative dates
  if (normalized === 'today') {
    return now.toISOString();
  }

  if (normalized === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString();
  }

  if (normalized === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString();
  }

  // "X days ago"
  const daysAgoMatch = normalized.match(/(\d+)\s*days?\s*ago/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  // "last week"
  if (normalized === 'last week') {
    const date = new Date(now);
    date.setDate(date.getDate() - 7);
    return date.toISOString();
  }

  // Try standard date parsing
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  // Indian date format DD/MM/YYYY
  const indianMatch = normalized.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (indianMatch) {
    const [, day, month, year] = indianMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
};

/**
 * Format ISO date for display
 */
export const formatDate = (
  isoString: string,
  format: 'short' | 'medium' | 'long' = 'medium'
): string => {
  const date = new Date(isoString);

  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: 'numeric', month: 'short' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  };
  const options = optionsMap[format];

  return date.toLocaleDateString('en-IN', options);
};

/**
 * Format date for transaction display (smart relative)
 */
export const formatTransactionDate = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();

  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  // Today
  if (isSameDay(date, now)) {
    return 'Today';
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  }

  // Within last 7 days - show day name
  const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAgo < 7 && daysAgo > 0) {
    return date.toLocaleDateString('en-IN', { weekday: 'long' });
  }

  // Same year - show day and month
  if (date.getFullYear() === now.getFullYear()) {
    return formatDate(isoString, 'short');
  }

  // Different year - show full date
  return formatDate(isoString, 'medium');
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

/**
 * Get month string for budget (YYYY-MM)
 */
export const getMonthString = (date: Date = new Date()): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Validate date is within acceptable range
 * Per spec: "Not future, not > 1 year old"
 */
export const isValidTransactionDate = (isoString: string): boolean => {
  const date = new Date(isoString);
  const now = new Date();

  if (isNaN(date.getTime())) {
    return false;
  }

  // Not in the future (allow same day)
  if (date.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
    return false;
  }

  // Not more than 1 year old
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (date.getTime() < oneYearAgo.getTime()) {
    return false;
  }

  return true;
};
