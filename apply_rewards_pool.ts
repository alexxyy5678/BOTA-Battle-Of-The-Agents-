import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const sql = `
    CREATE TABLE IF NOT EXISTS "platform_rewards_pools" (
      "id" serial PRIMARY KEY NOT NULL,
      "currency" varchar(16) DEFAULT 'USDC' NOT NULL,
      "total_amount" numeric(20, 8) DEFAULT '0' NOT NULL,
      "status" varchar(24) DEFAULT 'active' NOT NULL,
      "updated_at" timestamp DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS "platform_rewards_distributions" (
      "id" serial PRIMARY KEY NOT NULL,
      "total_pot" numeric(20, 8) NOT NULL,
      "eligible_users_count" integer NOT NULL,
      "total_eligible_bc" integer NOT NULL,
      "snapshot_at" timestamp DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS "user_rewards_claims" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" varchar NOT NULL,
      "distribution_id" integer NOT NULL,
      "bc_snapshot" integer NOT NULL,
      "share_amount_usdc" numeric(20, 8) NOT NULL,
      "status" varchar(24) DEFAULT 'pending' NOT NULL,
      "claimed_at" timestamp,
      "created_at" timestamp DEFAULT now()
    );

    DO $$ BEGIN
      ALTER TABLE "user_rewards_claims" ADD CONSTRAINT "user_rewards_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "user_rewards_claims" ADD CONSTRAINT "user_rewards_claims_distribution_id_platform_rewards_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."platform_rewards_distributions"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  console.log("Applying BOTA Rewards Pool tables...");
  try {
    await pool.query(sql);
    console.log("✅ Tables created successfully without touching existing schema!");

    // Initialize the default pool record
    await pool.query(`
      INSERT INTO "platform_rewards_pools" ("currency", "total_amount", "status") 
      SELECT 'USDC', 0, 'active' 
      WHERE NOT EXISTS (SELECT 1 FROM "platform_rewards_pools" LIMIT 1);
    `);
    console.log("✅ Default rewards pool initialized.");
  } catch (error) {
    console.error("Error creating tables:", error);
  } finally {
    await pool.end();
  }
}

main();
