import { db } from './server/db.js';
import * as schema from '@shared/schema.js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchFromSupabase(table: string) {
  let allData: any[] = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${limit}&offset=${offset}`, {
      headers: {
        "apikey": SUPABASE_KEY!,
        "Authorization": `Bearer ${SUPABASE_KEY!}`
      }
    });

    if (!res.ok) {
      console.error(`Error fetching ${table}:`, res.status, await res.text());
      break;
    }

    const data = await res.json();
    if (data.length > 0) {
      allData = allData.concat(data);
      offset += limit;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

function toCamel(s: string) {
  return s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

function convertKeys(obj: any) {
  const newObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    let val = value;
    if (typeof val === 'string' && val.length > 10 && !isNaN(Date.parse(val)) && val.includes('T')) {
      val = new Date(val);
    }
    newObj[toCamel(key)] = val;
  }
  return newObj;
}

async function migrate() {
  console.log("Starting Migration from Supabase REST -> Neon Drizzle...");

  try {
    // 1. Users
    const oldUsersRaw = await fetchFromSupabase('users');
    const oldUsers = oldUsersRaw.map(convertKeys);
    console.log(`Fetched ${oldUsers.length} users. Migrating...`);
    if (oldUsers.length > 0) {
      console.log("First user:", oldUsers[0]);
      await db.insert(schema.users).values(oldUsers).onConflictDoNothing();
    }

    // 2. Agents
    const oldAgentsRaw = await fetchFromSupabase('agents');
    const oldAgents = oldAgentsRaw.map(convertKeys);
    console.log(`Fetched ${oldAgents.length} agents. Migrating...`);
    if (oldAgents.length > 0) {
      await db.insert(schema.agents).values(oldAgents).onConflictDoNothing();
    }

    // 3. Transactions
    const oldTxsRaw = await fetchFromSupabase('transactions');
    const oldTxs = oldTxsRaw.map(convertKeys);
    console.log(`Fetched ${oldTxs.length} transactions. Migrating...`);
    if (oldTxs.length > 0) {
      await db.insert(schema.transactions).values(oldTxs).onConflictDoNothing();
    }

    // 4. Agent Memory
    const oldMemoriesRaw = await fetchFromSupabase('agentMemory');
    if (oldMemoriesRaw && oldMemoriesRaw.length > 0) {
      const oldMemories = oldMemoriesRaw.map(convertKeys);
      console.log(`Fetched ${oldMemories.length} agentMemories. Migrating...`);
      await db.insert(schema.agentMemory).values(oldMemories).onConflictDoNothing();
    }

    // 5. Bota Fighter Profiles
    const oldFightersRaw = await fetchFromSupabase('bota_fighter_profiles');
    if (oldFightersRaw && oldFightersRaw.length > 0) {
      const oldFighters = oldFightersRaw.map(convertKeys);
      console.log(`Fetched ${oldFighters.length} bota_fighter_profiles. Migrating...`);
      try {
        await db.insert(schema.botaFighterProfiles).values(oldFighters).onConflictDoNothing();
        console.log("Successfully inserted bota_fighter_profiles!");
      } catch (insertErr) {
        console.error("Error inserting bota_fighter_profiles:", insertErr);
      }
    }

    // 6. KOTH Participants
    const oldKothParticipantsRaw = await fetchFromSupabase('koth_participants');
    if (oldKothParticipantsRaw && oldKothParticipantsRaw.length > 0) {
      const oldKothParticipants = oldKothParticipantsRaw.map(convertKeys);
      console.log(`Fetched ${oldKothParticipants.length} koth_participants. Migrating...`);
      try {
        await db.insert(schema.kothParticipants).values(oldKothParticipants).onConflictDoNothing();
        console.log("Successfully inserted koth_participants!");
      } catch (insertErr) {
        console.error("Error inserting koth_participants:", insertErr);
      }
    }

    // 7. KOTH Trollbox Messages
    const oldKothTrollboxRaw = await fetchFromSupabase('koth_trollbox_messages');
    if (oldKothTrollboxRaw && oldKothTrollboxRaw.length > 0) {
      const oldKothTrollbox = oldKothTrollboxRaw.map(convertKeys);
      console.log(`Fetched ${oldKothTrollbox.length} koth_trollbox_messages. Migrating...`);
      try {
        await db.insert(schema.kothTrollboxMessages).values(oldKothTrollbox).onConflictDoNothing();
        console.log("Successfully inserted koth_trollbox_messages!");
      } catch (insertErr) {
        console.error("Error inserting koth_trollbox_messages:", insertErr);
      }
    }

    console.log("Migration completed successfully!");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
