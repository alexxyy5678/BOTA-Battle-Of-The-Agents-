import { config } from "dotenv";
config();
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Altering table with DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 20) + "...");
  try {
    await db.execute(sql`ALTER TABLE "bota_fighter_profiles" ADD COLUMN IF NOT EXISTS "combat_profile_id" text;`);
    console.log("Success adding combat_profile_id!");
    
    // There was also a failed query for bota_agent_pvp_challenges in the logs
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "bota_agent_pvp_challenges" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
        "challenge_code" varchar(80) NOT NULL UNIQUE,
        "status" varchar(24) NOT NULL DEFAULT 'pending',
        "match_type" varchar(24) NOT NULL DEFAULT 'arena',
        "visibility" varchar(24) NOT NULL DEFAULT 'public',
        "prediction_enabled" boolean NOT NULL DEFAULT true,
        "stake_amount" numeric(18, 6) NOT NULL DEFAULT 0,
        "stake_currency" varchar(16) NOT NULL DEFAULT 'USDC',
        "message" text,
        "challenger_user_id" varchar(180) NOT NULL,
        "opponent_owner_user_id" varchar(180),
        "challenger_agent_id" varchar(180) NOT NULL,
        "opponent_agent_id" varchar(180) NOT NULL,
        "challenger_agent" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "opponent_agent" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "expires_at" timestamp NOT NULL,
        "scheduled_at" timestamp,
        "accepted_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb
      );
    `);
    console.log("Success adding bota_agent_pvp_challenges!");
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
main();
