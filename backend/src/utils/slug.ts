// Multilingual slug utilities
// Supports: ru (transliteration), hy (basic fallback transliteration), en (ascii pass-through)
// Provides generateSlug(text, lang?) and ensureUniqueSlug(base, existingSet)

const cyrillicMap: Record<string,string> = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
};

// Basic Armenian to Latin (very simplified, can be improved later)
const armenianMap: Record<string,string> = {
  'ա':'a','բ':'b','գ':'g','դ':'d','ե':'e','զ':'z','է':'e','ը':'y','թ':'t','ժ':'zh','ի':'i','լ':'l','խ':'kh','ծ':'ts','կ':'k','հ':'h','ձ':'dz','ղ':'gh','ճ':'ch','մ':'m','յ':'y','ն':'n','շ':'sh','ո':'o','չ':'ch','պ':'p','ջ':'j','ռ':'r','ս':'s','վ':'v','տ':'t','ր':'r','ց':'c','ուչ':'u','փ':'p','ք':'q','և':'ev','օ':'o','ֆ':'f'
};

export function transliterate(input: string, lang?: string): string {
  const lower = input.toLowerCase();
  let out = '';
  for (const ch of lower) {
    if (/[a-z0-9]/.test(ch)) { out += ch; continue; }
    if (lang === 'hy' && armenianMap[ch]) { out += armenianMap[ch]; continue; }
    if (cyrillicMap[ch]) { out += cyrillicMap[ch]; continue; }
    if (/[-\s]/.test(ch)) { out += '-'; continue; }
    // drop other chars
  }
  // collapse dashes
  out = out.replace(/-+/g,'-').replace(/^-|-$/g,'');
  return out;
}

export function generateSlug(text: string, lang?: string): string {
  if (!text) return '';
  const base = transliterate(text, lang);
  return base || '';
}

export function ensureUniqueSlug(desired: string, existing: Set<string>): string {
  if (!existing.has(desired)) return desired;
  let i = 2;
  while (existing.has(`${desired}-${i}`)) i++;
  return `${desired}-${i}`;
}

export async function buildExistingSlugSet(categories: any[]): Promise<Set<string>> {
  const set = new Set<string>();
  for (const c of categories) {
    if (c.slug) set.add(c.slug);
    if (c.translations && typeof c.translations === 'object') {
      for (const val of Object.values<any>(c.translations)) {
        if (val?.slug) set.add(val.slug);
      }
    }
  }
  return set;
}
