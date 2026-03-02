import { jsPDF as JsPDF } from "jspdf";
import type jsPDF from "jspdf";
import html2canvas from "html2canvas";

export type KiralayanInfo = {
  unvan: string;
  adres: string;
  vergiNo: string;
  telefon: string;
  email: string;
  ticaretSicilNo?: string;
  mersisNo?: string;
};

export type KiraciInfo = {
  adSoyad: string;
  tcNo: string;
  vergiNo?: string;
  kurumsal?: boolean;
  ehliyetNo: string;
  ehliyetTarihi: string;
  adres: string;
  telefon: string;
  email: string;
};

export type AracInfo = {
  plaka: string;
  markaModel: string;
  sasiNo: string;
  kilometre: string;
  sigortaBitis?: string;
  sigortaFirma?: string;
  kaskoBitis?: string;
  kaskoFirma?: string;
};

export type KiralamaBedelInfo = {
  baslangicTarih: string;
  bitisTarih: string;
  gunlukKira: string;
  toplamKira: string;
  teminat: string;
  /** "aylik" ise tabloda "Aylık Kira" etiketi kullanılır */
  kiraTuru?: "gunluk" | "aylik";
  kdvDurumu: "dahil" | "haric";
};

export type SozlesmeImzaInfo = {
  kiralayan?: string;
  kiraci?: string;
  ikinciSofor?: string;
  /** 2. şoför adı (sözleşmede imza kutusunda gösterilir) */
  ikinciSoforAdi?: string;
  ikinciSoforEhliyetNo?: string;
  ikinciSoforEhliyetSinif?: string;
  ikinciSoforEhliyetTarih?: string;
};

const defaultKiralayan: KiralayanInfo = {
  unvan: "YALINIZLAR FİLO LTD. ŞTİ.",
  adres: "Yeşiloba Mah. 46120 Cad. Oto Galericiler Sitesi D Blok No: 15/8F Seyhan/ADANA",
  vergiNo: "Seyhan V.D.: 933 114 5509",
  telefon: "0531 392 47 69",
  email: "info@yalinizlarfilo.com.tr",
  ticaretSicilNo: "99106",
  mersisNo: "0933 1145 5090 0001",
};

const esc = (value: unknown): string => {
  const safe = String(value ?? "-");
  return safe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const buildKmRows = (): string => {
  const rows: string[] = [];
  for (let d = 1; d <= 31; d++) {
    const daily = d <= 8 ? "300" : "YOK";
    const total = d <= 8 ? String(d * 300) : "3000";
    rows.push(`<tr><td>${d}${d === 31 ? " +" : ""}</td><td>${daily}</td><td>${total}</td><td>${d}${d === 31 ? " +" : ""}</td><td>${daily}</td><td>${total}</td></tr>`);
  }
  return rows.join("");
};

const buildHasarTable = (): string => `
  <table class="hasar">
    <thead><tr><th>Otomobil Dışı Hasarlar</th><th>Mini</th><th>Küçük</th><th>Orta</th><th>Büyük</th></tr></thead>
    <tbody>
      <tr><td>Ön Tampon</td><td>₺2.000</td><td>₺5.000</td><td>₺10.000</td><td>₺22.375</td></tr>
      <tr><td>Arka Tampon</td><td>₺2.000</td><td>₺5.000</td><td>₺10.000</td><td>₺22.375</td></tr>
      <tr><td>Motor Kaputu</td><td>₺3.000</td><td>₺6.000</td><td>₺12.000</td><td>₺30.150</td></tr>
      <tr><td>Ön Çamurluk</td><td>₺2.500</td><td>₺6.000</td><td>₺10.000</td><td>₺25.838</td></tr>
      <tr><td>Arka Çamurluk</td><td>₺2.500</td><td>₺6.000</td><td>₺12.000</td><td>₺30.810</td></tr>
      <tr><td>Kapı</td><td>₺2.500</td><td>₺6.000</td><td>₺12.000</td><td>₺30.810</td></tr>
      <tr><td>Bagaj Kapağı</td><td>₺3.000</td><td>₺6.000</td><td>₺14.000</td><td>₺43.030</td></tr>
      <tr><td>Tavan</td><td>₺4.000</td><td>₺6.000</td><td>₺26.000</td><td>₺58.500</td></tr>
      <tr><td>Sağ – Sol Ayna</td><td colspan="2">₺3.000</td><td colspan="2">₺20.475</td></tr>
      <tr><td>Marşbiyel</td><td>-</td><td>₺6.000</td><td>₺14.000</td><td>₺37.000</td></tr>
      <tr><td>Ön - Arka Cam</td><td colspan="2">₺7.000</td><td colspan="2">₺28.015</td></tr>
      <tr><td>Ön - Arka Silecek</td><td colspan="4">₺3.000</td></tr>
      <tr><td>Çelik Jant (1 Adet)</td><td colspan="2">₺10.000</td><td colspan="2">₺19.900</td></tr>
      <tr><td>Alüminyum Jant (1 Adet)</td><td colspan="4">₺9.620</td></tr>
      <tr><td>Jant Kapağı (1 Adet)</td><td colspan="4">₺1.000</td></tr>
      <tr><td>Fren Lambası (Mini-Pasta Cila)</td><td colspan="2">₺5.000</td><td colspan="2">₺23.400</td></tr>
      <tr><td>Far (Mini-Pasta Cila)</td><td colspan="4">₺5.000</td></tr>
    </tbody>
    <thead><tr><th>Far (Değişim)</th><th>Ekonomik</th><th>Orta</th><th>Üst</th><th>Premium</th></tr></thead>
    <tbody>
      <tr><td></td><td>₺34.500</td><td>₺34.500</td><td>₺45.700</td><td>₺127.150</td></tr>
    </tbody>
    <thead><tr><th>Lastik (1 Adet)</th><th colspan="2">16 inç ve altı</th><th colspan="2">17 inç ve üstü</th></tr></thead>
    <tbody>
      <tr><td></td><td colspan="2">₺8.500</td><td colspan="2">₺13.000</td></tr>
      <tr><td>Lastik (1 Adet) Onarım</td><td colspan="4">₺1.000</td></tr>
    </tbody>
    <thead><tr><th>Otomobil İçi Hasarlar</th><th>Mini</th><th>Küçük</th><th>Orta</th><th>Büyük</th></tr></thead>
    <tbody>
      <tr><td>Detaylı Temizlik</td><td colspan="2">₺1.500 (Koku)</td><td colspan="2">₺2.900</td></tr>
      <tr><td>Sigara Yanığı</td><td colspan="4">₺6.500</td></tr>
      <tr><td>Koltuklar (Deforme)</td><td colspan="4">₺10.400</td></tr>
      <tr><td>Trafik Seti (Avadanlık)</td><td colspan="4">₺6.500</td></tr>
      <tr><td>Döşeme (Kapı&amp;Tavan)</td><td colspan="4">₺29.900</td></tr>
      <tr><td>CD - Teyp Çalar</td><td colspan="4">₺59.800</td></tr>
    </tbody>
    <thead><tr><th>Pandizot</th><th>Ekonomik</th><th>Orta</th><th>Üst</th><th>Premium</th></tr></thead>
    <tbody>
      <tr><td></td><td>₺9.000</td><td>₺9.000</td><td>₺16.000</td><td>₺20.000</td></tr>
    </tbody>
    <thead><tr><th>Stepne</th><th colspan="2">16 inç ve altı</th><th colspan="2">17 inç ve üstü</th></tr></thead>
    <tbody>
      <tr><td></td><td colspan="2">₺8.500</td><td colspan="2">₺13.000</td></tr>
    </tbody>
    <thead><tr><th colspan="5">Diğer Hizmet Bedelleri</th></tr></thead>
    <tbody>
      <tr><td>Hasar Yönetim Bedeli</td><td colspan="4">%5</td></tr>
      <tr><td>Yakıt Dolum Servisi</td><td colspan="4">%40</td></tr>
      <tr><td>HGS Geçiş Hizmeti</td><td colspan="4">Geçiş + %25 ilave</td></tr>
      <tr><td>Ruhsat</td><td colspan="4">₺8.000</td></tr>
      <tr><td>Plaka</td><td colspan="4">₺4.000</td></tr>
    </tbody>
    <thead><tr><th>Km Aşım</th><th>Ekonomik</th><th>Orta</th><th>Üst</th><th>Premium</th></tr></thead>
    <tbody>
      <tr><td></td><td>₺5</td><td>₺5</td><td>₺8</td><td>₺8</td></tr>
    </tbody>
  </table>
`;

const buildContractHtml = (params: {
  kiralayan: KiralayanInfo;
  kiraci: KiraciInfo;
  arac: AracInfo;
  kiralama: KiralamaBedelInfo;
  imzalar?: SozlesmeImzaInfo;
  imzaTarih: string;
}): string => {
  const { kiralayan, kiraci, arac, kiralama, imzalar, imzaTarih } = params;
  const renderSignatureImage = (src?: string) =>
    src
      ? `<img class="sign-image" src="${esc(src)}" alt="Imza" />`
      : `<div class="sign-placeholder"></div>`;
  return `
<!-- PAGE 1 -->
<div class="page">
  <div class="header">
    <div class="brand">YALINIZLAR<br/><span class="brand-sub">FİLO</span></div>
    <div class="title-wrap">
      <h1>ARAÇ KİRALAMA SÖZLEŞMESİ</h1>
      <div class="subtitle">Rental Agreement</div>
      <div class="meta">Sözleşme Tarihi: ${esc(imzaTarih)}</div>
    </div>
    <div class="company">
      <div><strong>${esc(kiralayan.unvan)}</strong></div>
      <div>${esc(kiralayan.adres)}</div>
      <div>Tel: ${esc(kiralayan.telefon)}</div>
      <div>Ticaret Sicil No: ${esc(kiralayan.ticaretSicilNo)}</div>
      <div>Mersis No: ${esc(kiralayan.mersisNo)}</div>
      <div>${esc(kiralayan.vergiNo)}</div>
    </div>
  </div>

  <h2 class="section-title">I – KİRALAMA SÖZLEŞMESİ KOŞULLARI</h2>

  <div class="grid two">
    <div class="box">
      <h3>KİRALAYAN</h3>
      <p><strong>Ünvan:</strong> ${esc(kiralayan.unvan)}</p>
      <p><strong>Ticaret Sicil:</strong> ${esc(kiralayan.ticaretSicilNo)}</p>
      <p><strong>Mersis:</strong> ${esc(kiralayan.mersisNo)}</p>
      <p><strong>Adres:</strong> ${esc(kiralayan.adres)}</p>
    </div>
    <div class="box">
      <h3>KİRACI / MÜŞTERİ</h3>
      <p><strong>${kiraci.kurumsal ? "Firma / Ad Soyad" : "Ad Soyad"}:</strong> ${esc(kiraci.adSoyad)}</p>
      <p><strong>${kiraci.kurumsal ? "Vergi No" : "TC"}:</strong> ${esc(kiraci.kurumsal ? kiraci.vergiNo : kiraci.tcNo)}</p>
      <p><strong>Ehliyet No:</strong> ${esc(kiraci.ehliyetNo)}</p>
      <p><strong>Ehliyet Tarihi:</strong> ${esc(kiraci.ehliyetTarihi)}</p>
      <p><strong>Telefon:</strong> ${esc(kiraci.telefon)}</p>
      <p><strong>E-posta:</strong> ${esc(kiraci.email)}</p>
      <p><strong>Adres:</strong> ${esc(kiraci.adres)}</p>
    </div>
  </div>

  <div class="box mt">
    <h3>ARAÇ VE KİRALAMA BİLGİLERİ</h3>
    <table>
      <tr><td><strong>Plaka:</strong> ${esc(arac.plaka)}</td><td><strong>Marka / Model:</strong> ${esc(arac.markaModel)}</td></tr>
      <tr><td><strong>Şasi No:</strong> ${esc(arac.sasiNo)}</td><td><strong>KM:</strong> ${esc(arac.kilometre)}</td></tr>
      <tr><td><strong>Sigorta:</strong> ${esc(arac.sigortaFirma)} / ${esc(arac.sigortaBitis)}</td><td><strong>Kasko:</strong> ${esc(arac.kaskoFirma)} / ${esc(arac.kaskoBitis)}</td></tr>
      <tr><td><strong>Başlangıç:</strong> ${esc(kiralama.baslangicTarih)}</td><td><strong>Bitiş:</strong> ${esc(kiralama.bitisTarih)}</td></tr>
      <tr><td><strong>${kiralama.kiraTuru === "aylik" ? "Aylık Kira" : "Günlük Kira"}:</strong> ${esc(kiralama.gunlukKira)} TL (${kiralama.kdvDurumu === "dahil" ? "KDV Dahil" : "+ KDV"})</td><td><strong>Toplam Kira:</strong> ${esc(kiralama.toplamKira)} TL (${kiralama.kdvDurumu === "dahil" ? "KDV Dahil" : "+ KDV"})</td></tr>
      <tr><td colspan="2"><strong>Teminat:</strong> ${esc(kiralama.teminat)} TL</td></tr>
    </table>
  </div>

  <div class="articles">
    <p><strong>1-</strong> Aracın kira bedeline ve diğer tüm giderlere ilişkin ödemeler kira süresinin başlangıcında MÜŞTERİ (Sözleşmede KİRACI veya MÜŞTERİ olarak zikredilecektir) adına kayıtlı geçerli bir kredi kartı ile veya nakit olarak peşin yapılacaktır. Ayrıca kiralama başlangıcında KİRACI'ya ait geçerli bir kredi kartından -sözleşmeye konu aracın niteliğine ve kira süresine göre belirlenecek tutarda- YALINIZLAR FİLO tarafından teminat niteliğinde tahsilat yapılacaktır. KİRACI anılan teminatın YALINIZLAR FİLO'ya olan doğmuş ve doğacak bütün borçlarının teminatı olduğunu ve YALINIZLAR FİLO'nun KİRACI'dan olan alacaklarını KİRACI'nın yeni bir izin, onay ya da kabulüne ya da mahkeme kararına gerek olmaksızın anılan teminat tutarından tahsile yetkili olduğunu peşinen kabul eder.</p>
    <p><strong>2-</strong> Sözleşmeye konu araç; teslim anında KİRACI tarafından kontrol edilerek teslim alınacaktır.</p>
    <p><strong>3-</strong> Kiralama süresince yapılacak tüm HGS geçiş bedelleri, otopark ücreti, trafik cezası, çekme ücreti ve bu tutarlara ek %25 hizmet bedeli KİRACI tarafından ödenecektir.</p>
    <p><strong>4-</strong> Aracın geri dönüşündeki depo yakıt oranının aracın ilk teslim anındaki oranından eksik olması halinde; eksik yakıt nispetince hesaplanacak yakıt bedeli ve %40 oranındaki hizmet bedeli KİRACI'dan tahsil edilecektir.</p>
    <p><strong>5-</strong> Sözleşmeye konu aracın sözleşme ile kararlaştırılan kilometre limitini aşması halinde, kilometre başına ekonomik segment ve orta segment araçlar için 5 TL, üst segment ve premium segment araçlar için 8 TL kilometre aşım bedeli KİRACI tarafından ödenecektir. (Bkz: III – Kilometre Limitleri Tablosu)</p>
    <p><strong>6-</strong> KİRACI T.C. kanunlarına ve yönetmeliklerine aykırılık teşkil edecek şekilde taşınması suç olarak belirtilen eşyaların taşınması ve/veya diğer gayrikanuni işlerde kullanmamayı ve/veya kullandırmamayı, aracı korsan taksicilik faaliyetlerinde kullanmamayı/kullandırmamayı, araçta hiçbir değişiklik yapmamayı, ücretli taşımacılık yapmamayı, ticari maksat ile yolcu ve eşya taşımamayı, araca zarar verecek ve yükleme haddini aşacak şekilde yük ve eşya taşımamayı, yarış, ralli, motorlu sporlar ile trafiğe kapalı ve uygun olmayan yollarda, dağlık arazi, kum, bataklık, dere yatağı vs. gibi yerlerde ve amaçları dışında kullanmamayı/kullandırmamayı, uyuşturucu etkisi altında veya alkollü olduğu hallerde otomobil kullanmamayı ve kullandırmamayı kabul ve taahhüt eder.</p>
    <p><strong>7-</strong> KİRACI sigorta teminatı dışında kalan (sahte rapor, alkollü kullanım, olay yeri terk, ehliyetsiz kullanım, v.b.) hasar bedelleri veya aracın kiralandığı süre içinde üçüncü kişilere verdikleri zarardan doğacak her türlü maddi – bedeni tazminatlar da dahil sigorta limitlerinin üzerindeki her türlü hak ve taleplerden sorumludur.</p>
    <p><strong>8-</strong> KİRACI, aracı her türlü güvenliği sağlayacak şekilde kapalı ve kilitli olarak park etmekle yükümlü olup olası kaza veya hırsızlıklara karşı önlem almakla mükelleftir. KİRACI aracın çalınması halinde, aracın anahtarı ve ruhsatını, ilgili emniyet birimlerini haberdar ettiğini ispatlamak kaydı ile YALINIZLAR FİLO'ya 24 saat içerisinde teslim etmek durumundadır.</p>
    <p><strong>9-</strong> Araçta meydana gelebilecek hasarlarda, kaza tespit tutanağı, alkol raporu, ehliyet ve ruhsat fotokopileri, kaza yeri fotoğrafları gibi belgelerin düzenlenerek asıllarının veya tasdikli fotokopilerinin, en geç 24 saat içinde YALINIZLAR FİLO'ya ulaştırılması gerekmektedir. Bu süre zarfında kira bedeli işlemeye devam eder.</p>
    <p><strong>10-</strong> Aracın içinde ve dışında meydana gelebilecek her türlü kayıp, aracın lastik ve jant hasarları, radyo teyp çalınmaları, teslim edilmiş avadanlıklar, aksesuarlar, stepne vb ile araca ait evraka kısımlarına gelecek zararlar KİRACI tarafından karşılanacaktır.</p>
    <p><strong>11-</strong> Aracın iadesi sırasında olağan kullanım dışında oluşmuş her türlü hasar/zarardan ve kirli teslimden kaynaklı temizlik ücreti ve bu tutarlar üzerinden hesaplanacak %5 hizmet bedelinin ödenmesinden KİRACI sorumlu olacaktır. (Bkz: II – Araç Geri Dönüşü Yansıtma Tutarları Tablosu)</p>
    <p><strong>12-</strong> KİRACI'nın kusurlu olduğu kazalarda kusur oranınca hesaplanacak hasar tutarı ve hasar bedelinin %5'i hizmet bedeli KİRACI'dan tahsil edilecektir.</p>
    <p><strong>13-</strong> Sözleşme konusu araçla ilgili acil bakım ihtiyacı söz konusu olursa bu ihtiyaç kiracı tarafından derhal gerçekleştirilecek olup eş zamanlı olarak YALINIZLAR FİLO bilgilendirilecek ve onayı alınacaktır.</p>
    <p><strong>14-</strong> YALINIZLAR FİLO, gerek kamu güvenliği, gerekse de başta mülkiyet hakkı olmak üzere meşru tüm haklarını muhafaza amacıyla, araçlarda araç takip sistemi kullanmaktadır. Araç takip sisteminin sökülmesi ve/veya bağlantının kesilmesi hali YALINIZLAR FİLO açısından sözleşmeye aykırılık kabul edilecektir.</p>
    <p><strong>15-</strong> KİRACI dışında kiralanan aracın başka kişi/kişiler tarafından kullanılması ve/veya kiralanan aracın sözleşme şartları ve amaç dışında kullanımının tespiti halinde YALINIZLAR FİLO sözleşmeyi tek taraflı olarak feshetme hakkına sahiptir.</p>
    <p><strong>16-</strong> KİRACI'nın veya ek sürücünün trafik kuralı ihlali (aşırı hız, ters yöne girme, trafik ışığı kural ihlali, drift, makas atma vb.) nedeniyle meydana gelebilecek kazalarda; araçta meydana gelebilecek hasarlara ilişkin YALINIZLAR FİLO tarafından belirlenecek onarım ve değer kaybı bedelinin tamamı tutarındaki cezai şart bedelinin KİRACI tarafından YALINIZLAR FİLO'ya ödeneceği hususunda taraflar tam mutabakata varmışlardır.</p>
    <p><strong>17-</strong> KİRACI, YALINIZLAR FİLO'ya sözleşmenin bitim tarihinde veya sözleşmenin feshedilmesi ya da herhangi bir nedenle sona ermesi halinde aracı iade edecektir. Kira süresinin uzatılması ancak YALINIZLAR FİLO'nun onayı ile mümkündür.</p>
    <p><strong>18-</strong> Aracın iade edilmediği 1 saate kadar olan gecikmelerde herhangi bir ücret talep edilmez. 1 saat ile 2 saat arası gecikmelere günlük kira bedelinin 1/3'ü oranında, bu süreyi aşan gecikmelere ise 1 günlük kira bedeli kadar cezai bedel tahsil edilecektir. 1 günü aşan gecikmeler için gecikilen her gün için 3 günlük kira bedeli kadar cezai şart tahsil edilecektir. Erken iade halinde ücret iadesi yapılmayacaktır.</p>
    <p><strong>19-</strong> KİRACI, kiralanan aracı iade ederken tüm kişisel eşyalarını alacağını ve araçta kişisel eşya / değerli eşya bırakmayacağını kabul eder. Kiralanan araçta unutulan eşyalarla ilgili sorumluluk tamamen kiracıya aittir.</p>
    <p><strong>20-</strong> İşbu sözleşmeden doğan borçların vadesinde ödenmemesi halinde KİRACI mütemerrit olur. Bu durumda, ödenmeyen her gün için alacağa aylık %5 oranında temerrüt faizi uygulanacaktır.</p>
    <p><strong>21-</strong> İşbu sözleşmeden doğan uyuşmazlıklarda Adana Mahkemeleri ve İcra Daireleri yetkilidir.</p>
  </div>
</div>

<!-- PAGE 2 – HASAR TABLOSU -->
<div class="page">
  <div class="page-header">YALINIZLAR FİLO – ARAÇ KİRALAMA SÖZLEŞMESİ (devam)</div>
  <h2 class="section-title">II – ARAÇ GERİ DÖNÜŞÜ YANSITMA TUTARLARI TABLOSU</h2>
  <p class="table-note">Bu tablo araç dönüşünde tespit edilecek hasarlara ve zararlara uygulanacak müşteri yansıtma tutarlarını ve hizmet bedellerini belirlemek üzere hazırlanmıştır. Belirlenen tutarlar minimum tutarlar olup, yetkili servis tutarlarına göre artış gösterebilir.</p>
  ${buildHasarTable()}
  <div class="table-footnotes">
    <p>- Standart ZMMS ve varsa ek sigorta paketlerinin karşılamadığı hasarlarda %5 hizmet bedeli alınır.</p>
    <p>- Anahtarın iade edilmemesi halinde kilit sisteminin değişmesi için gerekli tüm masraflar ve hasar hizmet bedeli KİRACI tarafından karşılanacaktır.</p>
    <p>- Korsan taksicilik faaliyetinde bulunulması halinde aracın trafikten men edildiği süre boyunca mahrum kalınacak kira bedeli, doğabilecek idari para cezaları ve yapılabilecek tüm yargılama giderleri KİRACI'ya yansıtılacaktır.</p>
  </div>
</div>

<!-- PAGE 3 – KM LİMİTLERİ + İMZALAR -->
<div class="page">
  <div class="page-header">YALINIZLAR FİLO – ARAÇ KİRALAMA SÖZLEŞMESİ (devam)</div>
  <h2 class="section-title">III – ARAÇ GRUBUNA GÖRE KİLOMETRE LİMİTLERİ</h2>
  <table class="km-table">
    <thead>
      <tr><th colspan="3">1. Grup Araçlar (Eko &amp; Orta)</th><th colspan="3">2. Grup Araçlar (Üst &amp; Premium)</th></tr>
      <tr><th>Gün</th><th>Günlük KM</th><th>Toplam KM</th><th>Gün</th><th>Günlük KM</th><th>Toplam KM</th></tr>
    </thead>
    <tbody>
      ${buildKmRows()}
    </tbody>
  </table>
  <div class="table-footnotes mt">
    <p>* Kira uzatmalarında ekstra km hakkı verilmemektedir.</p>
    <p>* Kilometre aşım bedeli km başına ekonomik segment ve orta segment araçlar için 5 TL, üst segment ve premium segment araçlar için 8 TL olarak uygulanmaktadır.</p>
    <p>* Ek km paketi alınması durumunda tabloda belirtilen toplam km limitine eklenecektir.</p>
    <p>* Belirtilen limitler, aynı ay içerisinde birden fazla araç kiralanması halinde bu araçların yapabileceği toplam kilometre limitidir.</p>
  </div>

  <div class="kvkk-box mt">
    <strong>Kişisel Verilerin Korunması Hakkında Aydınlatma Metni:</strong>
    <p>İşbu sözleşmenin kurulması ve ifası amacıyla YALINIZLAR FİLO tarafından işlenecek kişisel verilerinize ilişkin aydınlatma metnine www.yalinizlarfilo.com.tr adresinden erişebilirsiniz.</p>
  </div>

  <div class="signatures">
    <div class="sign-box">
      <div class="sign-title">KIRALAYAN (Kase / Imza)</div>
      <div class="sign-company">${esc(kiralayan.unvan)}</div>
      <div class="sign-image-wrap">${renderSignatureImage(imzalar?.kiralayan)}</div>
      <div class="line"></div>
    </div>
    <div class="sign-box">
      <div class="sign-title">KIRACI / MUSTERI IMZA</div>
      <div class="sign-image-wrap">${renderSignatureImage(imzalar?.kiraci)}</div>
      <div class="line"></div>
    </div>
    <div class="sign-box">
      <div class="sign-title">IKINCI SOFOR IMZA</div>
      ${imzalar?.ikinciSoforAdi ? `<div class="sign-company">${esc(imzalar.ikinciSoforAdi)}</div>` : ""}
      ${(imzalar?.ikinciSoforEhliyetNo || imzalar?.ikinciSoforEhliyetTarih) ? `<div class="sign-meta">${[imzalar.ikinciSoforEhliyetNo && `Ehliyet No: ${esc(imzalar.ikinciSoforEhliyetNo)}`, imzalar.ikinciSoforEhliyetSinif && `Sınıf: ${esc(imzalar.ikinciSoforEhliyetSinif)}`, imzalar.ikinciSoforEhliyetTarih && `Tarih: ${esc(imzalar.ikinciSoforEhliyetTarih)}`].filter(Boolean).join(" | ")}</div>` : ""}
      <div class="sign-image-wrap">${renderSignatureImage(imzalar?.ikinciSofor)}</div>
      <div class="line"></div>
    </div>
  </div>

  <div class="footer">
    İşbu sözleşme ${esc(imzaTarih)} tarihinde taraflarca okunarak imzalanmıştır.<br/>
    İşbu sözleşmenin tüm fikri mülkiyet hakları ${esc(kiralayan.unvan)}'ne ait olup, izinsiz çoğaltılması, kullanılması veya taklit edilmesi yasaktır.
  </div>
</div>
  `;
};

const buildHtmlDocument = (innerHtml: string): string => `
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    :root {
      --red-50: #fef2f2;
      --red-100: #fee2e2;
      --red-200: #fecaca;
      --red-600: #dc2626;
      --red-700: #b91c1c;
      --slate-600: #475569;
      --slate-800: #1f2937;
      --line: #e5e7eb;
    }
    body {
      margin: 0; padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #111827; background: #ffffff;
    }
    .page {
      width: 194mm;
      height: 282mm;
      margin: 0 auto; padding: 2mm 5mm 5mm 5mm;
      font-size: 10px; line-height: 1.4;
      overflow: hidden;
      border: 1px solid var(--red-100);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      background:
        radial-gradient(120px 120px at 100% 0%, #fff1f2 0%, rgba(255,255,255,0) 70%),
        radial-gradient(120px 120px at 0% 100%, #fff5f5 0%, rgba(255,255,255,0) 70%),
        #ffffff;
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }
    .page-header {
      text-align: right;
      font-size: 8px;
      color: var(--red-700);
      background: var(--red-50);
      border: 1px solid var(--red-200);
      border-radius: 999px;
      padding: 4px 12px;
      margin-bottom: 2px;
      display: inline-block;
      float: right;
      white-space: nowrap;
      line-height: 1.4;
    }
    .header {
      display: grid; grid-template-columns: 1.5fr 3fr 2.5fr;
      clear: both;
      gap: 2px;
      border: 1px solid var(--red-600);
      background: linear-gradient(180deg, #fff8f8 0%, var(--red-50) 100%);
      border-radius: 4px;
      padding: 2px; align-items: stretch;
    }
    .brand, .title-wrap, .company {
      border: 1px solid var(--red-200);
      background: #ffffff;
      border-radius: 4px;
      padding: 3px 6px;
    }
    .brand {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-size: 17px; font-weight: 800; color: var(--red-700);
      text-transform: uppercase; letter-spacing: 1px; line-height: 1.2;
      background: linear-gradient(180deg, #ffffff 0%, #fff5f5 100%);
    }
    .brand-sub { font-size: 12px; font-weight: 400; color: var(--red-600); letter-spacing: 2.5px; }
    .title-wrap { text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; }
    .title-wrap h1 {
      margin: 0;
      font-size: 14px;
      letter-spacing: 0.35px;
      color: var(--red-700);
      text-transform: uppercase;
      line-height: 1.35;
    }
    .subtitle { margin-top: 1px; color: #64748b; font-size: 9px; letter-spacing: 0.2px; line-height: 1.3; }
    .meta {
      margin-top: 2px;
      font-size: 9px;
      color: var(--red-700);
      display: inline-block;
      border: 1px solid var(--red-200);
      background: var(--red-50);
      border-radius: 999px;
      padding: 4px 10px;
      line-height: 1.35;
    }
    .company { font-size: 8.5px; color: var(--slate-800); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 2px 0; }
    .company div { margin-bottom: 2px; line-height: 1.35; }
    .section-title {
      font-size: 11px;
      font-weight: bold;
      color: #ffffff;
      background-color: var(--red-700);
      border-radius: 999px;
      margin: 2px 0 2px 0;
      padding: 4px 14px 5px 14px;
      letter-spacing: 0.2px;
      text-align: center;
      display: block;
      line-height: 1.35;
    }
    .grid.two { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; margin-top: 1px; }
    .box {
      border: 1px solid var(--line);
      padding: 5px 5px;
      background: #ffffff;
      border-radius: 4px;
      box-shadow: 0 1px 0 rgba(220, 38, 38, 0.05);
    }
    .box h3 {
      font-size: 9px;
      font-weight: bold;
      color: #ffffff;
      background-color: var(--red-700);
      border-radius: 3px;
      margin: 0 0 3px 0;
      padding: 3px 8px 4px 8px;
      letter-spacing: 0.45px;
      text-align: center;
      text-transform: uppercase;
      display: block;
      line-height: 1.3;
    }
    .box p {
      margin: 0 0 3px 0;
      padding: 0 2px;
      text-align: center;
      overflow-wrap: anywhere;
      word-break: break-word;
      line-height: 1.35;
    }
    .box p:last-child { margin-bottom: 0; }
    .mt { margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td, th {
      border: 1px solid var(--line);
      padding: 5px 6px 6px 6px;
      vertical-align: middle;
      font-size: 8.5px;
      line-height: 1.35;
      text-align: center;
      overflow-wrap: anywhere;
      word-break: break-word;
      font-variant-numeric: tabular-nums;
    }
    th {
      background: linear-gradient(180deg, #fff6f6 0%, var(--red-50) 100%);
      color: var(--red-700);
      font-weight: 700;
      text-align: center;
      line-height: 1.3;
    }
    tr:nth-child(even) td { background: #fcfcfd; }
    .articles {
      margin-top: 0;
      flex: 1 1 auto;
      min-height: 0;
    }
    .articles p {
      margin: 1px 0;
      padding: 0 1px;
      text-align: justify;
      font-size: 8.25px;
      line-height: 1.28;
      color: #0f172a;
    }
    .table-note {
      font-size: 8.5px;
      color: var(--slate-600);
      font-style: italic;
      margin-bottom: 4px;
      padding: 5px 8px;
      border-left: 2px solid var(--red-200);
      background: #fffdfd;
      line-height: 1.35;
    }
    .table-footnotes { margin-top: 4px; }
    .table-footnotes p { font-size: 8px; color: var(--slate-600); margin: 3px 0; padding: 0 2px; line-height: 1.35; }
    .hasar td, .hasar th { font-size: 8px; padding: 4px 5px; text-align: center; line-height: 1.3; }
    .hasar td:first-child, .hasar th:first-child { text-align: left; padding-left: 6px; }
    .km-table td, .km-table th { font-size: 8.5px; text-align: center; padding: 4px 5px; line-height: 1.35; }
    .kvkk-box {
      border: 1px solid var(--red-200);
      background: linear-gradient(180deg, #fff8f8 0%, var(--red-50) 100%);
      border-radius: 4px;
      padding: 6px 8px;
      font-size: 8.5px;
      color: #7f1d1d;
      line-height: 1.4;
    }
    .kvkk-box p { margin: 3px 0 0 0; }
    .signatures {
      margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;
    }
    .sign-box {
      border: 1px solid var(--line);
      border-top: 2px solid var(--red-600);
      border-radius: 4px;
      background: #fffefe;
      padding: 8px 8px 10px 8px;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .sign-title {
      font-weight: 700;
      font-size: 8.5px;
      margin: 0 0 2px 0;
      padding: 0 2px;
      text-align: center;
      color: var(--red-700);
      letter-spacing: 0.2px;
      white-space: nowrap;
      line-height: 1.35;
    }
    .sign-company { font-size: 7.5px; text-align: center; color: #475569; margin: 0 0 4px 0; padding: 0 2px; line-height: 1.3; }
    .sign-meta { font-size: 7px; text-align: center; color: #64748b; margin: 0 0 3px 0; padding: 0 2px; line-height: 1.3; }
    .sign-image-wrap {
      height: 56px; margin-bottom: 5px;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
      flex: 0 0 auto;
      min-width: 0;
    }
    .sign-image { max-width: 100%; max-height: 54px; object-fit: contain; }
    .sign-placeholder {
      width: 100%; height: 54px;
    }
    .line { display: none; }
    .footer {
      margin-top: 10px;
      border-top: 1px solid var(--red-200);
      padding-top: 5px;
      font-size: 8px;
      color: var(--slate-600);
      text-align: center;
      line-height: 1.45;
    }
  </style>
</head>
<body>${innerHtml}</body>
</html>
`;

const renderHtmlToPdf = async (html: string): Promise<jsPDF> => {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.width = "194mm"; // Use exactly the page width of the content box
  host.style.background = "#ffffff";
  host.innerHTML = buildHtmlDocument(html);
  document.body.appendChild(host);

  try {
    const imgs = host.querySelectorAll("img");
    await Promise.all(
      Array.from(imgs).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
      ),
    );

    const pages = host.querySelectorAll(".page");
    const pdf = new JsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i] as HTMLElement;

      // Let's ensure accurate rendering dimensions
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: pageEl.scrollWidth,
        windowHeight: pageEl.scrollHeight
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      // We know true A4 is ~210x297mm. 
      // Because we scaled the HTML down to 194x277 to allow built-in margin spacing.
      // We will place it directly centered on the A4 page without artificial scaling that corrupts limits.
      // Let's calculate exactly the aspect ratio needed to fill the screen best.

      const safeMargin = 2; // 2mm safe zone for printers
      const safeWidth = pageWidth - safeMargin * 2;
      const safeHeight = pageHeight - safeMargin * 2;

      const widthRatio = safeWidth / canvas.width;
      const heightRatio = safeHeight / canvas.height;

      // Do not multiply by 1.05, that caused clipping on the PDF itself
      const fitRatio = Math.min(widthRatio, heightRatio);

      const drawWidth = canvas.width * fitRatio;
      const drawHeight = canvas.height * fitRatio;
      const drawX = safeMargin + (safeWidth - drawWidth) / 2;
      const drawY = safeMargin + (safeHeight - drawHeight) / 2;

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", drawX, drawY, drawWidth, drawHeight);
    }

    return pdf;
  } finally {
    document.body.removeChild(host);
  }
};

export async function generateRentalContractPDF(params: {
  kiralayan?: Partial<KiralayanInfo>;
  kiraci: KiraciInfo;
  arac: AracInfo;
  kiralama: KiralamaBedelInfo;
  imzalar?: SozlesmeImzaInfo;
  imzaTarih: string;
}): Promise<jsPDF> {
  const fullKiralayan = { ...defaultKiralayan, ...params.kiralayan };
  const html = buildContractHtml({
    kiralayan: fullKiralayan,
    kiraci: params.kiraci,
    arac: params.arac,
    kiralama: params.kiralama,
    imzalar: params.imzalar,
    imzaTarih: params.imzaTarih,
  });

  return renderHtmlToPdf(html);
}

export async function downloadRentalContractPDF(
  params: Parameters<typeof generateRentalContractPDF>[0],
): Promise<void> {
  const doc = await generateRentalContractPDF(params);
  const plaka = (params.arac.plaka || "ARAC").replace(/\s+/g, "_");
  const tarih = params.imzaTarih.split(" ")[0].replace(/[./]/g, "_");
  doc.save(`Sozlesme_${plaka}_${tarih}.pdf`);
}
