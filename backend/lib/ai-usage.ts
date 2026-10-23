import { db } from "../db/raw";

export class UsageLimitError extends Error {
  constructor() { super("Yapay zekâ kullanım sınırına ulaşıldı (dakikada 6, saatte 60 istek). Bir süre sonra tekrar dene."); }
}

// Atomic reservation also counts failed provider calls. No student text is stored.
export async function reserveAIRequest(userId: string) {
  if (!userId) throw new Error("Yapay zekâ isteği için oturum açmalısın.");
  const minute = Math.floor(Date.now() / 60000), hour = Math.floor(Date.now() / 3600000);
  const result = await db().prepare(`INSERT INTO ai_usage(user_id,minute_window,minute_count,hour_window,hour_count)
    VALUES(?,?,1,?,1) ON CONFLICT(user_id) DO UPDATE SET
    minute_count=CASE WHEN minute_window=excluded.minute_window THEN minute_count+1 ELSE 1 END,
    hour_count=CASE WHEN hour_window=excluded.hour_window THEN hour_count+1 ELSE 1 END,
    minute_window=excluded.minute_window,hour_window=excluded.hour_window
    WHERE (minute_window!=excluded.minute_window OR minute_count<6)
      AND (hour_window!=excluded.hour_window OR hour_count<60)`)
    .bind(userId, minute, hour).run();
  if (!result.meta.changes) throw new UsageLimitError();
}
