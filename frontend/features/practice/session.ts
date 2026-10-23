export type Attempt = { id: string; correct: boolean };
export function recordAttempt(queue: string[], correct: boolean) {
  return correct ? queue.slice(1) : [...queue.slice(1), queue[0]];
}
export function summarize(attempts: Attempt[]) {
  const first = new Map<string, boolean>();
  for (const attempt of attempts) if (!first.has(attempt.id)) first.set(attempt.id, attempt.correct);
  const correct = [...first.values()].filter(Boolean).length;
  return { correct, wrong: first.size - correct, rate: first.size ? Math.round(correct / first.size * 100) : 0, repeats: attempts.length - first.size };
}
