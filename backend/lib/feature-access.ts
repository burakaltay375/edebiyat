import { db } from "../db/raw";

export async function extraFeaturesAllowed(userId: string): Promise<boolean> {
  const participant = await db().prepare("SELECT code FROM research_participants WHERE user_id=? AND consent=1").bind(userId).first();
  return !participant;
}
