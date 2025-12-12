import pg from 'pg';
const { Pool } = pg;

const projectId = '4d51b49f-b94c-4075-b578-97eb85e24a95';
const photoWidth = 1535;
const photoHeight = 2126;
const photoAspectRatio = (photoWidth / photoHeight).toFixed(3);

const pool = new Pool({
  connectionString: 'postgresql://photobooks:gjfkldlkf9859434502fjdManjf87@localhost:5432/photobooks_db'
});

try {
  const client = await pool.connect();
  try {
    await client.query(
      'UPDATE ar_projects SET photo_width = $1, photo_height = $2, photo_aspect_ratio = $3 WHERE id = $4',
      [photoWidth, photoHeight, photoAspectRatio, projectId]
    );
    console.log(`✅ Metadata updated for ${projectId}:`, { photoWidth, photoHeight, photoAspectRatio });
  } finally {
    client.release();
  }
} catch (error) {
  console.error('❌ Failed to update metadata:', error.message);
} finally {
  await pool.end();
}
