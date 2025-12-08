/**
 * Utility function to merge Tailwind CSS classes
 * Filters out falsy values and joins class names
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

