import { useTranslation } from '../context/LanguageContext';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function PrivacyPolicyPage() {
  const { language } = useTranslation();

  return (
    <div className="relative min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto w-full px-6 md:px-10 lg:px-16 pt-28 pb-20">
        {language === 'sl' ? <PrivacySL /> : <PrivacyEN />}
      </main>
      <Footer />
    </div>
  );
}

function PrivacyEN() {
  return (
    <article className="prose prose-invert prose-slate max-w-none prose-headings:tracking-tight prose-p:text-slate-400 prose-li:text-slate-400 prose-a:text-red-400 prose-strong:text-slate-200">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <h2>1. Data Controller</h2>
      <p>
        Daniel Pliberšek<br />
        Email: <a href="mailto:plibersek.daniel@gmail.com">plibersek.daniel@gmail.com</a>
      </p>

      <h2>2. What Data We Collect</h2>
      <h3>2.1 Contact Form</h3>
      <p>When you submit the contact form, we collect your <strong>name</strong>, <strong>email address</strong>, <strong>subject</strong>, and <strong>message content</strong>. This data is processed on the legal basis of <strong>legitimate interest</strong> (Art. 6(1)(f) GDPR) to respond to your inquiry.</p>

      <h3>2.2 Authentication</h3>
      <p>If you create an account or log in, we store your <strong>username</strong> and a <strong>hashed password</strong>. A session token is stored in an HTTP-only cookie. This is processed on the legal basis of <strong>contract performance</strong> (Art. 6(1)(b) GDPR).</p>

      <h3>2.3 Analytics</h3>
      <p>We collect basic, anonymous page visit data (page URL, timestamp, referrer, user agent) stored on our own self-hosted server. No third-party analytics services are used. Analytics is completely cookieless: <strong>no analytics tracking cookies are set</strong>. IP addresses are truncated upon write (the last octet of IPv4 addresses is zeroed out, and IPv6 addresses are truncated to /64). This processing is based on <strong>legitimate interest</strong> (Art. 6(1)(f) GDPR) to monitor site stability and performance.</p>

      <h3>2.4 Self-Hosted Fonts & Assets</h3>
      <p>All typography and fonts (Inter) are self-hosted directly from our own server. No connections or requests are made to external font delivery networks (such as Google Fonts).</p>

      <h3>2.5 Local Storage</h3>
      <p>We store your <strong>language preference</strong> and accessibility preferences in your browser local storage. This data remains on your device and is never transmitted to our servers.</p>

      <h2>3. Cookies</h2>
      <p>See our <a href="/cookies">Cookie Policy</a> for a detailed breakdown of cookies used on this site.</p>

      <h2>4. Data Retention</h2>
      <ul>
        <li><strong>Contact messages</strong> are retained until manually deleted by the data controller, or upon your request.</li>
        <li><strong>Authentication tokens</strong> expire after the session or as configured (typically 7 days).</li>
        <li><strong>Analytics data</strong> is retained for up to 12 months with truncated IP addresses.</li>
        <li><strong>Server disk logs</strong> are automatically purged after 30 days.</li>
      </ul>

      <h2>5. Data Processors & Infrastructure</h2>
      <p>All application data is stored on self-hosted infrastructure within the EU. We do not sell or rent personal data. For edge network routing, DDoS mitigation, and SSL/TLS termination, we use <strong>Cloudflare, Inc.</strong> as a data processor pursuant to standard contractual clauses under GDPR Art. 28.</p>

      <h2>6. Your Rights (GDPR)</h2>
      <p>Under the GDPR, you have the right to:</p>
      <ul>
        <li><strong>Access</strong> your personal data (Art. 15)</li>
        <li><strong>Rectify</strong> inaccurate data (Art. 16)</li>
        <li><strong>Erase</strong> your data ("right to be forgotten") (Art. 17)</li>
        <li><strong>Restrict</strong> processing (Art. 18)</li>
        <li><strong>Data portability</strong> (Art. 20)</li>
        <li><strong>Object</strong> to processing (Art. 21)</li>
        <li><strong>Withdraw consent</strong> at any time where processing is based on consent (Art. 7(3))</li>
      </ul>
      <p>To exercise any of these rights, contact us at <a href="mailto:plibersek.daniel@gmail.com">plibersek.daniel@gmail.com</a>.</p>

      <h2>7. Supervisory Authority</h2>
      <p>If you believe your data protection rights have been violated, you have the right to lodge a complaint with the <strong>Information Commissioner of the Republic of Slovenia</strong> (Informacijski pooblaščenec):</p>
      <p>
        Dunajska cesta 22, 1000 Ljubljana, Slovenia<br />
        Website: <a href="https://www.ip-rs.si" target="_blank" rel="noopener noreferrer">www.ip-rs.si</a><br />
        Email: gp.ip@ip-rs.si
      </p>

      <h2>8. Security</h2>
      <p>We implement appropriate technical and organisational measures to protect your personal data, including HTTPS encryption, hashed passwords (bcrypt cost 12), HTTP-only cookies, and self-hosted infrastructure.</p>

      <h2>9. Changes</h2>
      <p>We may update this policy from time to time. The "last updated" date at the top reflects the most recent revision.</p>
    </article>
  );
}

function PrivacySL() {
  return (
    <article className="prose prose-invert prose-slate max-w-none prose-headings:tracking-tight prose-p:text-slate-400 prose-li:text-slate-400 prose-a:text-red-400 prose-strong:text-slate-200">
      <h1>Politika zasebnosti</h1>
      <p className="text-sm text-slate-500">Zadnja posodobitev: {new Date().toLocaleDateString('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <h2>1. Upravljavec podatkov</h2>
      <p>
        Daniel Pliberšek<br />
        E-pošta: <a href="mailto:plibersek.daniel@gmail.com">plibersek.daniel@gmail.com</a>
      </p>

      <h2>2. Katere podatke zbiramo</h2>
      <h3>2.1 Kontaktni obrazec</h3>
      <p>Ko oddate kontaktni obrazec, zbiramo vaše <strong>ime</strong>, <strong>e-poštni naslov</strong>, <strong>zadevo</strong> in <strong>vsebino sporočila</strong>. Podatke obdelujemo na pravni podlagi <strong>zakonitega interesa</strong> (čl. 6(1)(f) GDPR) za odgovor na vaše povpraševanje.</p>

      <h3>2.2 Avtentikacija</h3>
      <p>Če se registrirate ali prijavite, shranimo vaše <strong>uporabniško ime</strong> in <strong>zgoščeno geslo</strong>. Žeton seje se shrani v HTTP-only piškotek. Obdelava temelji na <strong>izvajanju pogodbe</strong> (čl. 6(1)(b) GDPR).</p>

      <h3>2.3 Analitika</h3>
      <p>Zbiramo osnovne, anonimne podatke o obiskih strani (URL, časovni žig, napotitelj, uporabniški agent), shranjene na našem lastnem strežniku. Ne uporabljamo analitičnih storitev tretjih oseb. Analitika je popolnoma brezpiškotna: <strong>noben analitični piškotek se ne nastavi</strong>. IP naslovi so ob zapisu skrajšani (zadnji oktet pri IPv4 se ponastavi na 0, pri IPv6 se naslov skrajša na /64). Obdelava temelji na <strong>zakonitem interesu</strong> (čl. 6(1)(f) GDPR) za spremljanje delovanja spletnega mesta.</p>

      <h3>2.4 Lastno gostovane pisave in viri</h3>
      <p>Vse pisave (Inter) gostujemo neposredno na lastnem strežniku. Do zunanjih strežnikov za pisave (kot je Google Fonts) se ne izvajajo nobene zahteve.</p>

      <h3>2.5 Lokalna shramba</h3>
      <p>V lokalni shrambi brskalnika shranimo vaše <strong>jezikovne nastavitve</strong> in nastavitve dostopnosti. Ti podatki ostanejo na vaši napravi in se ne prenašajo na naše strežnike.</p>

      <h2>3. Piškotki</h2>
      <p>Za podroben pregled piškotkov obiščite našo <a href="/cookies">Politiko piškotkov</a>.</p>

      <h2>4. Hramba podatkov</h2>
      <ul>
        <li><strong>Kontaktna sporočila</strong> se hranijo do ročnega izbrisa s strani upravljavca ali na vašo zahtevo.</li>
        <li><strong>Avtentikacijski žetoni</strong> potečejo po seji ali po nastavljenem roku (običajno 7 dni).</li>
        <li><strong>Analitični podatki</strong> se hranijo do 12 mesecev s skrajšanimi IP naslovi.</li>
        <li><strong>Dnevniški zapisi strežnika na disku</strong> se samodejno izbrišejo po 30 dneh.</li>
      </ul>

      <h2>5. Obdelovalci podatkov in infrastruktura</h2>
      <p>Vsi podatki so shranjeni na lastni infrastrukturi znotraj EU. Vaših osebnih podatkov ne prodajamo. Za usmerjanje omrežnega prometa, zaščito pred DDoS napadi in zaključevanje SSL/TLS šifriranja kot obdelovalca podatkov uporabljamo družbo <strong>Cloudflare, Inc.</strong> v skladu z zahtevami 28. člena GDPR.</p>

      <h2>6. Vaše pravice (GDPR)</h2>
      <p>V skladu z GDPR imate pravico do:</p>
      <ul>
        <li><strong>Dostopa</strong> do osebnih podatkov (čl. 15)</li>
        <li><strong>Popravka</strong> netočnih podatkov (čl. 16)</li>
        <li><strong>Izbrisa</strong> podatkov ("pravica do pozabe") (čl. 17)</li>
        <li><strong>Omejitve</strong> obdelave (čl. 18)</li>
        <li><strong>Prenosljivosti</strong> podatkov (čl. 20)</li>
        <li><strong>Ugovora</strong> obdelavi (čl. 21)</li>
        <li><strong>Umika privolitve</strong> kadar koli, kjer obdelava temelji na privolitvi (čl. 7(3))</li>
      </ul>
      <p>Za uveljavljanje katerekoli pravice nas kontaktirajte na <a href="mailto:plibersek.daniel@gmail.com">plibersek.daniel@gmail.com</a>.</p>

      <h2>7. Nadzorni organ</h2>
      <p>Če menite, da so bile vaše pravice do varstva podatkov kršene, imate pravico vložiti pritožbo pri <strong>Informacijskem pooblaščencu RS</strong>:</p>
      <p>
        Dunajska cesta 22, 1000 Ljubljana<br />
        Spletna stran: <a href="https://www.ip-rs.si" target="_blank" rel="noopener noreferrer">www.ip-rs.si</a><br />
        E-pošta: gp.ip@ip-rs.si
      </p>

      <h2>8. Varnost</h2>
      <p>Izvajamo ustrezne tehnične in organizacijske ukrepe za zaščito vaših osebnih podatkov, vključno s šifriranjem HTTPS, zgoščenimi gesli (bcrypt cost 12), HTTP-only piškotki in lastno infrastrukturo.</p>

      <h2>9. Spremembe</h2>
      <p>To politiko lahko občasno posodobimo. Datum "zadnje posodobitve" na vrhu odraža zadnjo spremembo.</p>
    </article>
  );
}
