/**
 * AR Projects Migration Script
 * 
 * Migrates old AR projects from Backend DB to AR Microservice DB
 * Fixes: "Project not found" error when editing old projects
 * 
 * Run: node migrate-ar-projects.mjs
 */

import pg from 'pg';
const { Pool } = pg;

// Databases
const backendDb = new Pool({
  connectionString: 'postgresql://photobooks:SecurePassword2025@localhost:5433/photobooks',
});

const arDb = new Pool({
  connectionString: 'postgresql://photobooks:SecurePassword2025@localhost:5434/ar_db',
});

async function migrateProjects() {
  console.log('🔄 Starting AR projects migration...\n');

  try {
    // 1. Get all projects from Backend DB
    const backendResult = await backendDb.query(`
      SELECT id, user_id, order_id, photo_url, video_url, mask_url, 
             status, view_url, qr_code_url, marker_mind_url, viewer_html_url,
             marker_quality, compilation_time_ms, config, error_message,
             is_demo, expires_at, created_at, updated_at
      FROM ar_projects
      ORDER BY created_at DESC
    `);

    console.log(`📦 Found ${backendResult.rows.length} projects in Backend DB`);

    // 2. Check which already exist in AR microservice
    const arResult = await arDb.query('SELECT id FROM ar_projects');
    const existingIds = new Set(arResult.rows.map(r => r.id));

    console.log(`✅ ${existingIds.size} projects already in AR Microservice DB\n`);

    // 3. Migrate missing projects
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const project of backendResult.rows) {
      if (existingIds.has(project.id)) {
        console.log(`⏭️  Skip: ${project.id} (already exists)`);
        skipped++;
        continue;
      }

      try {
        await arDb.query(`
          INSERT INTO ar_projects (
            id, user_id, order_id, photo_url, video_url, mask_url,
            status, view_url, qr_code_url, marker_mind_url, viewer_html_url,
            marker_quality, compilation_time_ms, config, error_message,
            is_demo, expires_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `, [
          project.id,
          project.user_id,
          project.order_id,
          project.photo_url,
          project.video_url,
          project.mask_url,
          project.status,
          project.view_url,
          project.qr_code_url,
          project.marker_mind_url,
          project.viewer_html_url,
          project.marker_quality,
          project.compilation_time_ms,
          project.config ? JSON.stringify(project.config) : null,
          project.error_message,
          project.is_demo || false,
          project.expires_at,
          project.created_at,
          project.updated_at,
        ]);

        console.log(`✅ Migrated: ${project.id} (${project.status})`);
        migrated++;
      } catch (error) {
        console.error(`❌ Failed: ${project.id} - ${error.message}`);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total: ${backendResult.rows.length}`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('\n✅ Migration completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await backendDb.end();
    await arDb.end();
  }
}

migrateProjects();
