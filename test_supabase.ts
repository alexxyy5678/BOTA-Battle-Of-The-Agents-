import dotenv from 'dotenv';
dotenv.config();

async function testSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
  }

  console.log(`Connecting to ${supabaseUrl}`);

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/agents?select=*&limit=5`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (!res.ok) {
      console.error("Supabase Error:", res.status, res.statusText);
      console.error(await res.text());
    } else {
      const data = await res.json();
      console.log(`Success! Fetched ${data.length} agents.`);
    }
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

testSupabase();
