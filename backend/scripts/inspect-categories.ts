import 'dotenv/config';
import { storage } from '../src/storage';
import { db } from '../src/db';
import { categories } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function run(){
  const all = await storage.getCategories();
  console.log('\nTotal categories:', all.length);
  const subs = all.filter(c=>c.parentId);
  console.log('Subcategories count:', subs.length);
  console.log('Sample subcategories (first 5):', subs.slice(0,5).map(s=>({id:s.id, parent:s.parentId, slug:s.slug, nameRu:(s.name as any)?.ru})));

  const tree = await storage.getCategoriesHierarchy();
  console.log('\nHierarchy roots:', tree.length);
  console.log('First root sample:', tree[0] ? {id:tree[0].id, children: tree[0].children?.length} : null);

  // Find recently deleted (logically) categories with empty name detected earlier pattern (slug remained but removed now)
  const suspicious = all.filter(c => { const ru = (c.name as any)?.ru; return !ru || ru.trim()===''; });
  console.log('\nSuspicious (empty name) still present:', suspicious.length);
}
run().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
