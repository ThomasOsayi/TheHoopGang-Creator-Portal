// src/lib/week-utils.ts

/**
 * Week utility functions for V3 leaderboard tracking
 * Uses ISO week numbering (Monday = start of week)
 */

/**
 * Gets the current ISO week string
 * @returns Format: "2025-W50"
 */
export function getCurrentWeek(): string {
    const now = new Date();
    return getWeekString(now);
  }
  
  /**
   * Gets the ISO week string for a given date
   * @param date - The date to get the week for
   * @returns Format: "2025-W50"
   */
  export function getWeekString(date: Date): string {
    const week = getISOWeek(date);
    const year = getISOWeekYear(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
  
  /**
   * Gets the ISO week number for a date (1-53)
   * ISO weeks start on Monday, and week 1 contains Jan 4th
   */
  export function getISOWeek(date: Date): number {
    const target = new Date(date.valueOf());
    // Set to nearest Thursday (current date + 4 - current day number)
    // Make Sunday day 7
    const dayNum = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNum + 3);
    // Get first Thursday of year
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const firstDayNum = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstDayNum + 3);
    // Calculate week number
    const diff = target.getTime() - firstThursday.getTime();
    return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
  }
  
  /**
   * Gets the ISO week year (may differ from calendar year at year boundaries)
   */
  export function getISOWeekYear(date: Date): number {
    const target = new Date(date.valueOf());
    target.setDate(target.getDate() + 3 - ((date.getDay() + 6) % 7));
    return target.getFullYear();
  }
  
  /**
   * Gets the start of an ISO week (Monday 00:00:00)
   * @param weekString - Format: "2025-W50"
   * @returns Date object for Monday at midnight
   */
  export function getWeekStart(weekString: string): Date {
    const [year, weekPart] = weekString.split('-W');
    const week = parseInt(weekPart, 10);
    
    // Jan 4th is always in week 1
    const jan4 = new Date(parseInt(year, 10), 0, 4);
    const dayOfWeek = (jan4.getDay() + 6) % 7; // Monday = 0
    
    // Get to Monday of week 1
    const week1Monday = new Date(jan4);
    week1Monday.setDate(jan4.getDate() - dayOfWeek);
    
    // Add weeks to get to target week
    const targetMonday = new Date(week1Monday);
    targetMonday.setDate(week1Monday.getDate() + (week - 1) * 7);
    targetMonday.setHours(0, 0, 0, 0);
    
    return targetMonday;
  }
  
  /**
   * Gets the end of an ISO week (Sunday 23:59:59.999)
   * @param weekString - Format: "2025-W50"
   * @returns Date object for Sunday at end of day
   */
  export function getWeekEnd(weekString: string): Date {
    const monday = getWeekStart(weekString);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  }
  
  /**
   * Checks if a week string represents the current week
   * @param weekString - Format: "2025-W50"
   */
  export function isCurrentWeek(weekString: string): boolean {
    return weekString === getCurrentWeek();
  }
  
  /**
   * Gets milliseconds until the next week reset (Sunday 23:59:59.999 → Monday 00:00:00)
   * @returns Milliseconds until reset
   */
  export function getTimeUntilReset(): number {
    const now = new Date();
    const currentWeek = getCurrentWeek();
    const weekEnd = getWeekEnd(currentWeek);
    return Math.max(0, weekEnd.getTime() - now.getTime());
  }
  
  /**
   * Formats time until reset as a human-readable string
   * @returns e.g., "2d 5h 30m" or "5h 30m" or "30m"
   */
  export function formatTimeUntilReset(): string {
    const ms = getTimeUntilReset();
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    
    return parts.join(' ');
  }
  
  /**
   * Gets the current month string for GMV leaderboard
   * @returns Format: "2025-12"
   */
  export function getCurrentMonth(): string {
    const now = new Date();
    return getMonthString(now);
  }
  
  /**
   * Gets the month string for a given date
   * @param date - The date to get the month for
   * @returns Format: "2025-12"
   */
  export function getMonthString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }
  
  /**
   * Gets the start of a month
   * @param monthString - Format: "2025-12"
   * @returns Date object for 1st of month at midnight
   */
  export function getMonthStart(monthString: string): Date {
    const [year, month] = monthString.split('-').map(Number);
    return new Date(year, month - 1, 1, 0, 0, 0, 0);
  }
  
  /**
   * Gets the end of a month
   * @param monthString - Format: "2025-12"
   * @returns Date object for last day of month at 23:59:59.999
   */
  export function getMonthEnd(monthString: string): Date {
    const [year, month] = monthString.split('-').map(Number);
    // Month is 0-indexed, so passing `month` gives us the 1st of NEXT month
    // Then subtracting 1 day gives us the last day of the target month
    const lastDay = new Date(year, month, 0);
    lastDay.setHours(23, 59, 59, 999);
    return lastDay;
  }
  
  /**
   * Checks if a month string represents the current month
   * @param monthString - Format: "2025-12"
   */
  export function isCurrentMonth(monthString: string): boolean {
    return monthString === getCurrentMonth();
  }
  
  /**
   * Gets the previous N weeks as an array of week strings
   * @param count - Number of weeks to get (default 4)
   * @returns Array of week strings, most recent first
   */
  export function getPreviousWeeks(count: number = 4): string[] {
    const weeks: string[] = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - (i * 7));
      weeks.push(getWeekString(targetDate));
    }
    
    return weeks;
  }
  
  /**
   * Gets the previous N months as an array of month strings
   * @param count - Number of months to get (default 6)
   * @returns Array of month strings, most recent first
   */
  export function getPreviousMonths(count: number = 6): string[] {
    const months: string[] = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(getMonthString(targetDate));
    }
    
    return months;
  }