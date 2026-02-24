const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { count, error } = await supabase
        .from("monitored_links")
        .select("*", { count: "exact", head: true });

    console.log("Error:", error);
    console.log("Count:", count);
}
test();
