import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
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
