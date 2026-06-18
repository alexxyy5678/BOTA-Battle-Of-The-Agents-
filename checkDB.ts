import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function check() {
  const res = await db.execute(sql`SELECT status, count(*) FROM bota_arena_battle_records GROUP BY status`);
  console.log("Records:", res);
  process.exit(0);
}
check().catch(console.error);
