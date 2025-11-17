import 'dotenv/config';
import { db } from '../src/db';
import { categories, products } from '../../shared/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

const parentId = 'dd2bb2d8-c785-40ce-8ac6-45339d51eb26';
const clusterNames = ['Свадебная','Детская','Фотокнига','Классическая'];

function slugifyRu(text: string){
  return text.toLowerCase()
    .replace(/[ё]/g,'e')
    .replace(/[^a-z0-9\u0400-\u04FF\s-]/g,'')
    .replace(/\s+/g,'-')
    .replace(/-+/g,'-')
    .replace(/[ъь]/g,'')
    .replace(/[й]/g,'i')
    .replace(/[ы]/g,'y')
    .replace(/[ч]/g,'ch')
    .replace(/[ш]/g,'sh')
    .replace(/[щ]/g,'sch')
    .replace(/[ц]/g,'c')
    .replace(/[ж]/g,'zh')
    .replace(/[а]/g,'a')
    .replace(/[б]/g,'b')
    .replace(/[в]/g,'v')
    .replace(/[г]/g,'g')
    .replace(/[д]/g,'d')
    .replace(/[еэ]/g,'e')
    .replace(/[з]/g,'z')
    .replace(/[и]/g,'i')
    .replace(/[к]/g,'k')
    .replace(/[л]/g,'l')
    .replace(/[м]/g,'m')
    .replace(/[н]/g,'n')
    .replace(/[о]/g,'o')
    .replace(/[п]/g,'p')
    .replace(/[р]/g,'r')
    .replace(/[с]/g,'s')
    .replace(/[т]/g,'t')
    .replace(/[у]/g,'u')
    .replace(/[ф]/g,'f')
    .replace(/[х]/g,'h')
    .replace(/[ю]/g,'yu')
    .replace(/[я]/g,'ya')
    .replace(/[^a-z0-9-]/g,'');
}

async function ensureUnique(base: string){
  let candidate = base;
  let i=1;
  while(true){
    const existing = await db.select({id: categories.id}).from(categories).where(eq(categories.slug, candidate)).limit(1);
    if (existing.length===0) return candidate;
    candidate = `${base}-${i++}`;
  }
}

async function run(){
  console.log('[RECREATE] Start');
  const existing = await db.select().from(categories).where(eq(categories.parentId, parentId));
  const existingSlugs = new Set(existing.map(c=>c.slug));
  const map: Record<string,string> = {};

  for (const name of clusterNames){
    const base = slugifyRu(name);
    if (existingSlugs.has(base)) { map[name]=[...existing].find(c=>c.slug===base)!.id; continue; }
    const unique = await ensureUnique(base);
    const translations = {
      ru: { name, slug: unique, description: ''},
      hy: { name: '', slug: unique+'-hy', description: ''},
      en: { name: '', slug: unique+'-en', description: ''}
    };
    const nameJson = { ru: name, hy: '', en: ''};
    const descriptionJson = { ru: '', hy: '', en: ''};
    const insertValues: any = { name: nameJson, slug: unique, description: descriptionJson, translations, parentId, sortOrder: 0, isActive: true };
    const inserted = await db.insert(categories).values(insertValues).returning();
    const id = Array.isArray(inserted) ? inserted[0].id : (inserted as any).id;
    map[name]=id;
    console.log(`[RECREATE] Created subcategory ${name} -> ${unique} (${id})`);
  }

  // Reattach products
  const prods = await db.select().from(products);
  let reassigned=0;
  for (const p of prods){
    if (p.subcategoryId) continue;
    const ru = (p.name as any)?.ru || '';
    const first = ru.split(' ')[0];
    if (map[first]){
  await db.update(products).set({ subcategoryId: map[first] } as any).where(eq(products.id, p.id));
      reassigned++;
    }
  }
  console.log(`[RECREATE] Reassigned products: ${reassigned}`);
  console.log('[RECREATE] Done');
}

run().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
