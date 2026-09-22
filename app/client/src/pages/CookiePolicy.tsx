import { useTranslation } from '../context/LanguageContext';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function CookiePolicyPage() {
  const { language } = useTranslation();

  return (
    <div className="relative min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto w-full px-6 md:px-10 lg:px-16 pt-28 pb-20">
        {language === 'sl' ? <CookiesSL /> : <CookiesEN />}
      </main>
      <Footer />
    </div>
  );
}

function CookiesEN() {
  return (
    <article className="prose prose-invert prose-slate max-w-none prose-headings:tracking-tight prose-p:text-slate-400 prose-li:text-slate-400 prose-a:text-red-400 prose-strong:text-slate-200">
      <h1>Cookie Policy</h1>
      <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <p>This site uses cookies and similar technologies in accordance with the <strong>General Data Protection Regulation (GDPR)</strong> and <strong>Zakon o elektronskih komunikacijah (ZEKom-2)</strong>, Article 225.</p>

      <h2>What Are Cookies?</h2>
      <p>Cookies are small text files placed on your device by a website. They help the site remember your preferences and improve your experience.</p>

      <h2>Cookies We Use</h2>

      <h3>Strictly Necessary Cookies</h3>
      <p>These cookies are essential for the site to function. They do not require consent under ZEKom-2 Art. 225(5).</p>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr>
          </thead>
          <tbody>
            <tr><td><code>token</code></td><td>Authentication session (JWT). Set only when you log in. HTTP-only, secure.</td><td>7 days</td></tr>
            <tr><td><code>cookie_consent</code></td><td>Stores your cookie consent preference.</td><td>365 days</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Analytics (Cookieless)</h3>
      <p>Our website analytics are completely cookieless and self-hosted. <strong>No analytics cookies are set</strong>, and no personal tracking cookies are placed on your device.</p>

      <h3>Local Storage (Not Cookies)</h3>
      <p>The following data is stored in your browser's local storage and never sent to our servers:</p>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr><th>Key</th><th>Purpose</th></tr>
          </thead>
          <tbody>
            <tr><td><code>lang</code></td><td>Your language preference (en/sl)</td></tr>
            <tr><td><code>font-size</code></td><td>Your text size accessibility preference</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Managing Cookies</h2>
      <p>You can withdraw your consent at any time by clearing your cookies or using the cookie banner settings. You can also configure your browser to block or delete cookies.</p>

      <h2>Third-Party Cookies</h2>
      <p>This site does <strong>not</strong> use any third-party cookies. All analytics are self-hosted.</p>

      <h2>Contact</h2>
      <p>For questions about our cookie practices, contact us at <a href="mailto:plibersek.daniel@gmail.com">plibersek.daniel@gmail.com</a>.</p>
    </article>
  );
}

function CookiesSL() {
  return (
    <article className="prose prose-invert prose-slate max-w-none prose-headings:tracking-tight prose-p:text-slate-400 prose-li:text-slate-400 prose-a:text-red-400 prose-strong:text-slate-200">
      <h1>Politika piškotkov</h1>
      <p className="text-sm text-slate-500">Zadnja posodobitev: {new Date().toLocaleDateString('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <p>Ta spletna stran uporablja piškotke in podobne tehnologije v skladu s <strong>Splošno uredbo o varstvu podatkov (GDPR)</strong> in <strong>Zakonom o elektronskih komunikacijah (ZEKom-2)</strong>, člen 225.</p>

      <h2>Kaj so piškotki?</h2>
      <p>Piškotki so majhne besedilne datoteke, ki jih spletna stran namesti na vašo napravo. Pomagajo strani si zapomniti vaše nastavitve in izboljšati vašo izkušnjo.</p>

      <h2>Piškotki, ki jih uporabljamo</h2>

      <h3>Nujno potrebni piškotki</h3>
      <p>Ti piškotki so bistveni za delovanje strani. Za njih privolitev ni potrebna po ZEKom-2 čl. 225(5).</p>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr><th>Piškotek</th><th>Namen</th><th>Trajanje</th></tr>
          </thead>
          <tbody>
            <tr><td><code>token</code></td><td>Avtentikacijska seja (JWT). Nastavi se samo ob prijavi. HTTP-only, varno.</td><td>7 dni</td></tr>
            <tr><td><code>cookie_consent</code></td><td>Shranjuje vašo privolitev za piškotke.</td><td>365 dni</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Analitika (brezpiškotna)</h3>
      <p>Naša analitika obiskov je povsem brezpiškotna in gostuje na lastnem strežniku. <strong>Nobeni analitični piškotki se ne nastavljajo</strong>, na vašo napravo pa ne nameščamo nobenih sledilnih piškotkov.</p>

      <h3>Lokalna shramba (niso piškotki)</h3>
      <p>Naslednji podatki se shranjujejo v lokalni shrambi brskalnika in se nikoli ne pošljejo na naše strežnike:</p>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr><th>Ključ</th><th>Namen</th></tr>
          </thead>
          <tbody>
            <tr><td><code>lang</code></td><td>Vaša jezikovna nastavitev (en/sl)</td></tr>
            <tr><td><code>font-size</code></td><td>Vaša nastavitev velikosti besedila</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Upravljanje piškotkov</h2>
      <p>Privolitev lahko kadar koli umaknete z brisanjem piškotkov ali prek nastavitev pasice za piškotke. Piškotke lahko blokirate ali izbrišete tudi v nastavitvah brskalnika.</p>

      <h2>Piškotki tretjih oseb</h2>
      <p>Ta spletna stran <strong>ne</strong> uporablja piškotkov tretjih oseb. Vsa analitika je lastna.</p>

      <h2>Kontakt</h2>
      <p>Za vprašanja o naših praksah piškotkov nas kontaktirajte na <a href="mailto:plibersek.daniel@gmail.com">plibersek.daniel@gmail.com</a>.</p>
    </article>
  );
}
