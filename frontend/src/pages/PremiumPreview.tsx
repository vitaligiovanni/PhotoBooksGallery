import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function PremiumPreview() {
  useEffect(() => {
    const root = document.documentElement;
    // Remember previous inline variable values to restore later
    const keys = [
      "--background","--foreground","--card","--card-foreground","--popover","--popover-foreground",
      "--primary","--primary-foreground","--secondary","--secondary-foreground","--accent","--accent-foreground",
      "--destructive","--destructive-foreground","--border","--input","--ring",
      "--gradient-bg","--gradient-card","--gradient-header"
    ];
    const prev = new Map<string, string | null>();
    keys.forEach(k => prev.set(k, root.style.getPropertyValue(k)));

    // Apply premium editorial palette inline for isolated preview (no persistence)
    root.classList.add("theme-premium");
    root.style.setProperty("--background", "#F6F3EE");
    root.style.setProperty("--foreground", "#1C1C1C");
    root.style.setProperty("--card", "#FFFFFF");
    root.style.setProperty("--card-foreground", "#1C1C1C");
    root.style.setProperty("--popover", "#FFFFFF");
    root.style.setProperty("--popover-foreground", "#1C1C1C");
    root.style.setProperty("--primary", "#1C1C1C");
    root.style.setProperty("--primary-foreground", "#F6F3EE");
    root.style.setProperty("--secondary", "#153E35");
    root.style.setProperty("--secondary-foreground", "#F6F3EE");
    root.style.setProperty("--accent", "#C9A227");
    root.style.setProperty("--accent-foreground", "#1C1C1C");
    root.style.setProperty("--destructive", "#B00020");
    root.style.setProperty("--destructive-foreground", "#FFFFFF");
    root.style.setProperty("--border", "#E6E1D9");
    root.style.setProperty("--input", "#E6E1D9");
    root.style.setProperty("--ring", "#C9A227");
    root.style.setProperty("--gradient-bg", "#F6F3EE");
    root.style.setProperty("--gradient-card", "#FFFFFF");
    root.style.setProperty("--gradient-header", "linear-gradient(90deg, #1C1C1C 0%, #111111 100%)");

    return () => {
      // Restore previous inline values and remove the class
      prev.forEach((v, k) => {
        if (v) root.style.setProperty(k, v);
        else root.style.removeProperty(k);
      });
      root.classList.remove("theme-premium");
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-[1200px] px-6 py-5 flex items-center justify-between">
          <div className="text-2xl font-serif">PHOTOBOOKSGALLERY</div>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a className="hover:underline underline-offset-4" href="#">Каталог</a>
            <a className="hover:underline underline-offset-4" href="#">Примеры</a>
            <a className="hover:underline underline-offset-4" href="#">О нас</a>
            <a className="hover:underline underline-offset-4" href="#">Контакты</a>
          </nav>
          <Button variant="premium">Создать фотокнигу</Button>
        </div>
      </header>

      <main>
        <section className="border-b border-border">
          <div className="mx-auto max-w-[1200px] px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="font-serif text-5xl leading-tight mb-6">Ваши истории — в премиальных фотокнигах</h1>
              <p className="text-lg text-muted-foreground mb-8">Соберите книгу за несколько минут. Мы напечатаем — так, как для себя.</p>
              <div className="flex items-center gap-4">
                <Button variant="premium" className="px-6">Создать фотокнигу</Button>
                <Button variant="outline" className="px-6 border-[#C9A227] text-foreground">Посмотреть примеры</Button>
              </div>
              <div className="mt-8 text-sm text-muted-foreground">
                Гарантия печати • Перепечать бесплатно • Доставка по всей стране
              </div>
            </div>
            <div className="rounded-lg overflow-hidden border border-border">
              <div className="aspect-[4/3] bg-[url('https://images.unsplash.com/photo-1529651737248-dad5e287768e?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center" />
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1200px] px-6 py-14">
            <h2 className="font-serif text-3xl mb-8">Как это работает</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { t: "Выберите шаблон", d: "Минималистичные премиум-макеты." },
                { t: "Загрузите фото", d: "Мы подскажем лучшие кадры." },
                { t: "Закажите печать", d: "Премиальные материалы и переплёт." },
              ].map((s, i) => (
                <div key={i} className="p-6 border border-border rounded-lg bg-card">
                  <div className="text-sm text-muted-foreground mb-2">0{i + 1}</div>
                  <div className="font-serif text-xl mb-2">{s.t}</div>
                  <div className="text-sm text-muted-foreground">{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card/50">
          <div className="mx-auto max-w-[1200px] px-6 py-14">
            <h2 className="font-serif text-3xl mb-8">Лучшие работы клиентов</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="group border border-border rounded-lg overflow-hidden">
                  <div className="aspect-[4/3] bg-muted group-hover:opacity-95 transition" />
                  <div className="p-4">
                    <div className="font-serif text-lg">Фотокнига “Путешествие”</div>
                    <div className="text-sm text-muted-foreground">Идеальная на память</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-[1200px] px-6 py-10 text-sm text-muted-foreground">
          © {new Date().getFullYear()} PhotoBooksGallery. Все права защищены.
        </div>
      </footer>
    </div>
  );
}
