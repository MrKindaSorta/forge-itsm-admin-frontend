import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the user's timezone offset in minutes (e.g., -360 for CST)
 */
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

/**
 * Get the user's timezone name (e.g., "America/Chicago")
 */
export function getTimezoneName(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get start and end ISO timestamps for a date range in the user's local timezone
 * @param days - Number of days (0 = today only, 7 = last 7 days, etc.)
 * @returns Object with startDate and endDate as ISO strings
 */
export function getDateRangeForTimezone(days: number): { startDate: string; endDate: string } {
  const now = new Date();

  // End of today in local timezone (23:59:59.999)
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  // Start date: beginning of day X days ago (00:00:00.000)
  const startDate = new Date(now);
  if (days === -1) {
    // "All Time" - start from a very old date (e.g., 10 years ago)
    // Note: buildDateParams() handles this by not sending date filters at all
    // This is just for display purposes
    startDate.setFullYear(startDate.getFullYear() - 10);
    startDate.setHours(0, 0, 0, 0);
  } else if (days === 0) {
    // "Today" - start of today
    startDate.setHours(0, 0, 0, 0);
  } else {
    // X days ago at start of day
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Format a date string for display in the user's local timezone
 */
export function formatDate(dateString: string | number): string {
  let date: Date;

  // Check if input is Unix timestamp (seconds)
  if (typeof dateString === 'number' || /^\d+$/.test(String(dateString))) {
    const timestamp = typeof dateString === 'string' ? parseInt(dateString, 10) : dateString;
    // Convert seconds to milliseconds (SQLite unixepoch() returns seconds)
    date = new Date(timestamp * 1000);
  } else {
    // Assume ISO string format
    date = new Date(dateString);
  }

  // Use user's local timezone (no timeZone specified = local)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format a date with explicit timezone indicator
 */
export function formatDateWithTimezone(dateString: string | number): string {
  let date: Date;

  // Check if input is Unix timestamp (seconds)
  if (typeof dateString === 'number' || /^\d+$/.test(String(dateString))) {
    const timestamp = typeof dateString === 'string' ? parseInt(dateString, 10) : dateString;
    date = new Date(timestamp * 1000);
  } else {
    date = new Date(dateString);
  }

  // Use user's local timezone with timezone name shown
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export function formatRelativeTime(dateString: string | number): string {
  let date: Date;

  // Check if input is Unix timestamp (seconds)
  if (typeof dateString === 'number' || /^\d+$/.test(String(dateString))) {
    const timestamp = typeof dateString === 'string' ? parseInt(dateString, 10) : dateString;
    // Convert seconds to milliseconds
    date = new Date(timestamp * 1000);
  } else {
    // Assume ISO string format
    date = new Date(dateString);
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return formatDate(dateString);
}
