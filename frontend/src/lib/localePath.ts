export type Lang = 'ru' | 'hy' | 'en';

export function parseLangFromPath(pathname: string): { lang: Lang | null; pathWithoutLang: string } {
  const m = pathname.match(/^\/(ru|hy|en)(?:($)|\/(.*))/);
  if (!m) return { lang: null, pathWithoutLang: pathname || '/' };
  const lang = m[1] as Lang;
  const rest = m[3] ? `/${m[3]}` : '/';
  return { lang, pathWithoutLang: rest };
}

export function buildAlternateUrls(origin: string, pathname: string) {
  const { pathWithoutLang } = parseLangFromPath(pathname);
  const tail = pathWithoutLang === '/' ? '' : pathWithoutLang;
  return {
    ru: `${origin}/ru${tail}`,
    hy: `${origin}/hy${tail}`,
    en: `${origin}/en${tail}`,
    xDefault: `${origin}${pathWithoutLang}`,
  };
}
