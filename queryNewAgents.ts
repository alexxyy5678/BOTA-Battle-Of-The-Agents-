import { db } from './server/db';
import { botaFighterProfiles } from '@shared/schema';
import { gte } from 'drizzle-orm';

async function main() {
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
  
  const newAgents = await db
    .select({
      id: botaFighterProfiles.id,
      agentId: botaFighterProfiles.agentId,
      displayName: botaFighterProfiles.displayName,
      createdAt: botaFighterProfiles.createdAt,
      metadata: botaFighterProfiles.metadata,
    })
    .from(botaFighterProfiles)
    .where(gte(botaFighterProfiles.createdAt, fiveHoursAgo));
    
  console.log('New agents created in the last 5 hours: ' + newAgents.length);
  for (const agent of newAgents) {
    console.log('- ' + agent.displayName + ' (' + agent.agentId + ') created at ' + agent.createdAt);
    console.log('  Metadata:', agent.metadata);
  }
  process.exit(0);
}

main().catch(console.error);
