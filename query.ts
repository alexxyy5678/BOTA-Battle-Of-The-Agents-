import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT wallet_address) as count 
      FROM bota_fighter_profiles 
      WHERE origin != 'wild' 
        AND origin != 'system' 
        AND wallet_address IS NOT NULL;
    `);
    console.log('Count:', result.rows[0].count);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}
main();
