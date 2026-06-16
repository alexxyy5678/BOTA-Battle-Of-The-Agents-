import { db } from "./server/db.js";
import { botaFighterProfiles } from "@shared/schema.js";
import { desc } from "drizzle-orm";

async function getTopAgent() {
  const topAgents = await db.select()
  .from(botaFighterProfiles)
  .orderBy(desc(botaFighterProfiles.wins))
  .limit(5);

  console.log("Top Agents:", JSON.stringify(topAgents, null, 2));
  process.exit(0);
}

getTopAgent().catch(console.error);
