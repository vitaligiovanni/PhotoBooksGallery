import 'dotenv/config';
import { db } from '../src/db';
import { products, categories } from '../../shared/schema';
import { eq, isNull, sql } from 'drizzle-orm';
import { storage } from '../src/storage';

/*
  Heuristic recovery:
  - Find products whose subcategoryId was nulled during cleanup but previously had a categoryId or slug patterns.
  - Since we lack historical snapshot, we can group products by name patterns or previously stored hashtags (if included) to attempt cluster-based recreation.
  (Simplified: list products now lacking subcategory but previously referencing deleted category IDs we logged in console.)
*/

async function run(){
  console.log('\n[RECOVER] Listing products with NULL subcategoryId but non-null categoryId ...');
  const orphaned = await db.select().from(products).where(isNull(products.subcategoryId));
  console.log('[RECOVER] Total products (any):', orphaned.length);
  const grouped: Record<string, number> = {};
  for (const p of orphaned){
    const ru = (p.name as any)?.ru || ''; 
    const key = ru.split(' ')[0];
    grouped[key] = (grouped[key]||0)+1;
  }
  console.log('[RECOVER] Name first-token distribution (top 10):', Object.entries(grouped).sort((a,b)=>b[1]-a[1]).slice(0,10));
  console.log('\n(No automatic recreation implemented yet — will implement only after user confirmation.)');
}
run().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
