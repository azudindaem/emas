import Link from 'next/link'
import {
  Package,
  Truck,
  FileText,
  BarChart3,
  Users,
  Printer,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  Headphones,
  Star,
  Mail,
  Phone,
  MapPin,
  ShoppingCart,
  Layers,
  Bell,
} from 'lucide-react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: ShoppingCart,
    title: 'Pengurusan Pesanan',
    desc: 'Terima, proses, dan jejak pesanan dari pelbagai saluran jualan dalam satu dashboard yang mudah.',
  },
  {
    icon: Truck,
    title: 'Integrasi Kurier',
    desc: 'Sambung terus ke NinjaVan, J&T, POS Malaysia, DHL dan lebih 8 kurier popular Malaysia.',
  },
  {
    icon: Printer,
    title: 'Cetak AWB & Invois',
    desc: 'Jana dan cetak Air Waybill (AWB) serta invois pelanggan dengan satu klik sahaja.',
  },
  {
    icon: Package,
    title: 'Pengurusan Inventori',
    desc: 'Pantau stok produk secara masa nyata. Terima amaran apabila stok hampir habis.',
  },
  {
    icon: BarChart3,
    title: 'Laporan & Statistik',
    desc: 'Analisa prestasi jualan, pantau trend, dan eksport data untuk tujuan audit.',
  },
  {
    icon: Users,
    title: 'Pengurusan Pengguna',
    desc: 'Wujudkan peranan dan kebenaran akses berbeza untuk setiap ahli pasukan anda.',
  },
  {
    icon: Bell,
    title: 'Notifikasi Automatik',
    desc: 'Hantar notifikasi status pesanan kepada pelanggan melalui WhatsApp atau emel.',
  },
  {
    icon: Layers,
    title: 'Multi-Tenant',
    desc: 'Setiap perniagaan mendapat ruang kerja tersendiri dengan data yang diasingkan sepenuhnya.',
  },
  {
    icon: FileText,
    title: 'Invois Digital',
    desc: 'Jana invois profesional untuk penjual dan pembeli secara automatik bagi setiap transaksi.',
  },
]

const whyUs = [
  {
    icon: Zap,
    title: 'Pantas & Mudah',
    desc: 'Antara muka yang bersih dan intuitif. Mula guna dalam masa beberapa minit tanpa latihan teknikal.',
  },
  {
    icon: Shield,
    title: 'Selamat & Boleh Dipercayai',
    desc: 'Data perniagaan anda dilindungi sepenuhnya. Sistem kami beroperasi 99.9% uptime.',
  },
  {
    icon: Headphones,
    title: 'Sokongan Pelanggan',
    desc: 'Pasukan sokongan kami sedia membantu anda melalui WhatsApp dan emel pada setiap hari bekerja.',
  },
]

const plans = [
  {
    name: 'Starter',
    price: 'RM 49',
    desc: 'Sesuai untuk perniagaan baru bermula',
    features: [
      'Sehingga 500 pesanan/bulan',
      '2 pengguna',
      '3 integrasi kurier',
      'AWB & invois asas',
      'Laporan ringkas',
      'Sokongan emel',
    ],
  },
  {
    name: 'Pro',
    price: 'RM 149',
    desc: 'Paling popular untuk perniagaan aktif',
    features: [
      'Pesanan tanpa had',
      '10 pengguna',
      'Semua integrasi kurier',
      'AWB & invois lanjutan',
      'Laporan penuh & eksport',
      'Notifikasi WhatsApp',
      'Sokongan keutamaan',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'Untuk perniagaan skala besar',
    features: [
      'Pengguna tanpa had',
      'White label',
      'Domain tersuai',
      'Integrasi API penuh',
      'Pengurus akaun dedikasi',
      'SLA terjamin',
      'Sokongan 24/7',
    ],
  },
]

const couriers = [
  'NinjaVan',
  'J&T Express',
  'POS Malaysia',
  'DHL eCommerce',
  'Flash Express',
  'GDEX',
  'Skynet',
  'Airpak',
]

const stats = [
  { value: '500+', label: 'Perniagaan Aktif' },
  { value: '1M+', label: 'Pesanan Diproses' },
  { value: '8+', label: 'Integrasi Kurier' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 z-50">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-base">E</span>
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">emas</span>
          </a>

          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">Ciri-Ciri</a>
            <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">Harga</a>
            <a href="#contact" className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">Hubungi</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2">
              Log Masuk
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary-dark transition-colors shadow-sm"
            >
              Cuba Percuma <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="pt-36 pb-24 px-5 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-semibold px-4 py-2 rounded-full mb-7 border border-amber-200">
            <Zap size={13} className="fill-amber-500 text-amber-500" />
            Platform SaaS Pengurusan Perniagaan Malaysia
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
            Urus Pesanan &amp; Penghantaran<br />
            <span className="text-primary">Lebih Pantas, Lebih Mudah</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Satu platform untuk terima pesanan, cetak AWB, integrasi kurier, dan pantau inventori —
            semua dalam satu papan pemuka yang bersih.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-primary-dark transition-colors shadow-md"
            >
              Cuba Percuma Sekarang <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-semibold text-base hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              Log Masuk
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-slate-900">{s.value}</p>
                <p className="text-sm text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COURIER PARTNERS ───────────────────────────────────────────────── */}
      <section className="py-12 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-5">
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-7">
            Integrasi Kurier Disokong
          </p>
          <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4">
            {couriers.map((name) => (
              <div
                key={name}
                className="bg-white border border-slate-200 rounded-xl px-5 py-2.5 text-slate-700 font-semibold text-sm shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-default"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">Ciri-Ciri Utama</p>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Semua Yang Perniagaan Anda Perlukan</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Direka khas untuk peniaga online Malaysia. Lengkap, mudah, dan berkesan.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-white border border-slate-100 rounded-2xl p-7 hover:border-amber-200 hover:shadow-lg transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-5 group-hover:bg-amber-100 transition-colors">
                  <f.icon size={22} className="text-primary" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ──────────────────────────────────────────────────── */}
      <section className="py-28 px-5 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">Kenapa Emas?</p>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Dipercayai Ribuan Peniaga Malaysia</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Kami komited untuk membantu perniagaan anda berkembang dengan solusi terbaik.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {whyUs.map((w) => (
              <div key={w.title} className="text-center px-6 py-8">
                <div className="w-16 h-16 rounded-2xl bg-white border border-amber-100 shadow-sm flex items-center justify-center mx-auto mb-6">
                  <w.icon size={28} className="text-primary" />
                </div>
                <h3 className="font-bold text-slate-900 text-xl mb-3">{w.title}</h3>
                <p className="text-slate-500 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">Pelan Harga</p>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Harga Berpatutan, Nilai Terbaik</h2>
            <p className="text-slate-500 text-lg">Tiada kontrak. Tiada caj tersembunyi. Boleh batal bila-bila masa.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-7 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 border transition-all ${
                  i === 1
                    ? 'border-primary bg-sidebar shadow-2xl scale-105'
                    : 'border-slate-200 bg-white hover:shadow-xl'
                }`}
              >
                {i === 1 && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-md">
                    PALING POPULAR
                  </div>
                )}

                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${i === 1 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {plan.name}
                </p>

                <div className="flex items-end gap-1 mb-1">
                  <span className={`text-4xl font-bold ${i === 1 ? 'text-white' : 'text-slate-900'}`}>
                    {plan.price}
                  </span>
                  {plan.price !== 'Custom' && (
                    <span className={`text-sm mb-2 ${i === 1 ? 'text-slate-400' : 'text-slate-400'}`}>/bulan</span>
                  )}
                </div>

                <p className={`text-sm mb-7 ${i === 1 ? 'text-slate-400' : 'text-slate-500'}`}>{plan.desc}</p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle
                        size={16}
                        className={`shrink-0 mt-0.5 ${i === 1 ? 'text-amber-400' : 'text-primary'}`}
                      />
                      <span className={i === 1 ? 'text-slate-300' : 'text-slate-700'}>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={i === 2 ? '#contact' : '/register'}
                  className={`block text-center py-3.5 rounded-xl font-bold text-sm transition-colors ${
                    i === 1
                      ? 'bg-primary text-white hover:bg-primary-dark'
                      : 'bg-amber-50 text-primary hover:bg-amber-100 border border-amber-100'
                  }`}
                >
                  {i === 2 ? 'Hubungi Kami' : 'Mulakan Sekarang'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-5" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-amber-300 text-xs font-semibold px-4 py-2 rounded-full mb-7 border border-white/10">
            <Star size={12} className="fill-amber-300 text-amber-300" />
            Percubaan percuma 14 hari. Tiada kad kredit diperlukan.
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
            Sedia Untuk Mulakan?
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
            Sertai ribuan peniaga Malaysia yang sudah mempercayai Emas untuk menguruskan perniagaan mereka.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-primary text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-primary-dark transition-colors shadow-lg"
          >
            Cuba Percuma <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer id="contact" className="bg-slate-900 text-slate-400 py-16 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-base">E</span>
                </div>
                <span className="font-bold text-lg text-white tracking-tight">emas</span>
              </div>
              <p className="text-sm leading-relaxed">
                Platform SaaS all-in-one untuk pengurusan pesanan, cetakan AWB, dan integrasi kurier bagi perniagaan Malaysia.
              </p>
            </div>

            <div>
              <p className="font-bold text-white text-xs uppercase tracking-widest mb-5">Platform</p>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Ciri-Ciri</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Harga</a></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Daftar Akaun</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Log Masuk</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white text-xs uppercase tracking-widest mb-5">Integrasi Kurier</p>
              <ul className="space-y-3 text-sm">
                <li>NinjaVan Malaysia</li>
                <li>J&amp;T Express</li>
                <li>POS Malaysia</li>
                <li>DHL &amp; lain-lain</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white text-xs uppercase tracking-widest mb-5">Hubungi Kami</p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2.5">
                  <Mail size={14} className="text-primary shrink-0" />
                  <a href="mailto:info@emas.my" className="hover:text-white transition-colors">info@emas.my</a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone size={14} className="text-primary shrink-0" />
                  <a href="https://wa.me/601XXXXXXXX" className="hover:text-white transition-colors">WhatsApp</a>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                  <span>Malaysia</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p>© {new Date().getFullYear()} Emas. Hak cipta terpelihara.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-white transition-colors">Dasar Privasi</a>
              <a href="#" className="hover:text-white transition-colors">Terma Penggunaan</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

