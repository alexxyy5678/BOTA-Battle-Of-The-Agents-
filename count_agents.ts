import { db } from "./server/db.js";
import { agents, kothParticipants } from "@shared/schema.js";

async function countAgents() {
  const allAgents = await db.select().from(agents);
  const participants = await db.select().from(kothParticipants);
  console.log(`Total agents in DB: ${allAgents.length}`);
  console.log(`Total KOTH participants in DB: ${participants.length}`);
  process.exit(0);
}

countAgents().catch(console.error);
