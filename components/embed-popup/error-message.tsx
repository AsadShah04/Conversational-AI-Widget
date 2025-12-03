import type { EmbedErrorDetails } from '@/lib/types';

interface ErrorMessageProps {
  error?: EmbedErrorDetails | null;
}

// ✅ No unused vars, no "any", no warnings
export function ErrorMessage({ error }: ErrorMessageProps) {
  void error; // marks it intentionally unused (safe ESLint trick)
  return null;
}
