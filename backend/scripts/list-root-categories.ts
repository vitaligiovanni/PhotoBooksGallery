import 'dotenv/config';
import { storage } from '../src/storage';

async function run(){
  const all = await storage.getCategories();
  const roots = all.filter(c => !c.parentId);
  console.log('\n[ROOT CATEGORIES SUMMARY] count =', roots.length);
  for (const r of roots){
    const name = (r.name as any)?.ru || JSON.stringify(r.name);
    console.log(`- id: ${r.id} | slug: ${r.slug} | name.ru: ${name}`);
  }
  console.log('\nReply with mapping like:');
  console.log('{ "parentId": "<choose-one-id>", "clusters": { "Свадебная": true, "Детская": true, "Фотокнига": true, "Классическая": true } }');
}
run().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
