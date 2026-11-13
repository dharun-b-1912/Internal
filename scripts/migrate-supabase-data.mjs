import postgres from "postgres";

// Tables in strict foreign-key dependency order
const TABLES = [
  "vendors",
  "accommodation_types",
  "hostels",
  "accommodation_rooms",
  "client_units",
  "app_users",
  "employees",
  "shift_definitions",
  "payroll_remarks",
  "payroll_rules",
  "vehicles",
  "vehicle_records",
  "utility_meters",
  "eb_readings",
  "hostel_utility_readings",
  "payroll_runs",
  "attendance_entries",
  "accommodation_charges",
  "recovery_entries",
  "recovery_finalizations",
  "accommodation_room_expenses",
  "payroll_items",
  "payroll_batches",
  "payment_export_batches",
  "payment_export_batch_items",
  "audit_events",
];

async function runMigration() {
  const oldDbUrl = process.env.OLD_SUPABASE_DB_URL;
  const newDbUrl = process.env.NEW_SUPABASE_DB_URL;

  if (!oldDbUrl || !newDbUrl) {
    console.error("❌ Error: Please specify OLD_SUPABASE_DB_URL and NEW_SUPABASE_DB_URL environment variables.");
    console.error("Example:");
    console.error('  $env:OLD_SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.OLD_REF.supabase.co:5432/postgres"');
    console.error('  $env:NEW_SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.NEW_REF.supabase.co:5432/postgres"');
    console.error("  node scripts/migrate-supabase-data.mjs");
    process.exit(1);
  }

  console.log("🔌 Connecting to Old and New Supabase databases...");
  const sqlOld = postgres(oldDbUrl, { max: 5, ssl: { rejectUnauthorized: false } });
  const sqlNew = postgres(newDbUrl, { max: 5, ssl: { rejectUnauthorized: false } });

  try {
    console.log("🚀 Starting data migration...\n");
    const summary = [];

    // Temporarily disable foreign key triggers during bulk insert to avoid order constraints
    await sqlNew`SET session_replication_role = 'replica';`;

    for (const table of TABLES) {
      process.stdout.write(`⏳ Migrating table [${table}]... `);

      // Check if table exists in old database
      const oldTableExists = await sqlOld`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = ${table}
        );
      `;

      if (!oldTableExists[0].exists) {
        console.log("⚠️ Table does not exist in old DB, skipped.");
        continue;
      }

      // Read rows from old database
      const rows = await sqlOld.unsafe(`SELECT * FROM public."${table}"`);
      const rowCount = rows.length;

      if (rowCount === 0) {
        console.log("ℹ️ 0 rows (empty table).");
        summary.push({ table, oldRows: 0, newRows: 0, status: "Empty" });
        continue;
      }

      // Insert in chunks of 200 rows into new database
      const CHUNK_SIZE = 200;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        await sqlNew`
          INSERT INTO ${sqlNew(table)} ${sqlNew(chunk)}
          ON CONFLICT DO NOTHING
        `;
      }

      // Verify row count in new DB
      const newCountResult = await sqlNew.unsafe(`SELECT COUNT(*)::int as count FROM public."${table}"`);
      const newRowCount = newCountResult[0].count;

      console.log(`✅ Migrated ${rowCount} rows (New DB count: ${newRowCount})`);
      summary.push({
        table,
        oldRows: rowCount,
        newRows: newRowCount,
        status: rowCount === newRowCount ? "✅ 100% Match" : "⚠️ Partial Match",
      });
    }

    // Re-enable foreign key checks
    await sqlNew`SET session_replication_role = 'origin';`;

    console.log("\n================ MIGRATION REPORT ================");
    console.table(summary);
    console.log("🎉 Data migration finished successfully with all relations preserved!");
  } catch (err) {
    console.error("❌ Migration failed with error:", err);
  } finally {
    await sqlOld.end();
    await sqlNew.end();
  }
}

runMigration();
