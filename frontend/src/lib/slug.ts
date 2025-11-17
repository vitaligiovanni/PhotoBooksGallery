// Frontend mirror of backend slug utilities (approximate parity)

const cyrillicMap: Record<string,string> = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
};

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
  }
  out = out.replace(/-+/g,'-').replace(/^-|-$/g,'');
  return out;
}

export function generateSlug(text: string, lang?: string): string {
  if (!text) return '';
  return transliterate(text, lang);
}
