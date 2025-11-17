import 'dotenv/config';
import { storage } from '../src/storage';
import { db } from '../src/db';
import { categories } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function run(){
  const all = await storage.getCategories();
  const sub = all.find(c => c.slug === 'detskie-fotoknigi-test');
  if (sub) {
    console.log('Found subcategory:', {
      id: sub.id,
      slug: sub.slug,
      name: sub.name,
      coverImage: sub.coverImage,
      bannerImage: sub.bannerImage,
      translations: sub.translations
    });
  } else {
    console.log('Subcategory not found');
  }
}
run().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});