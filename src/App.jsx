
import { useEffect, useState } from 'react';
import {
  Search, ShoppingBag, Store, Truck, Headphones,
  UserRound, Menu, ArrowLeft, ShieldCheck, Globe2,
  Package, LogIn, UserPlus, X
} from 'lucide-react';
import { supabase } from './supabase.js';

const categories = [
  { name: 'الإلكترونيات', icon: '📱' },
  { name: 'الأزياء', icon: '👕' },
  { name: 'المنزل', icon: '🏠' },
  { name: 'الجمال والعناية', icon: '✨' },
  { name: 'الألعاب', icon: '🎮' },
  { name: 'منتجات متنوعة', icon: '🛍️' }
];

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [session, setSession] = useState(null);
  const [notice, setNotice] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadProducts();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => setSession(nextSession)
    );

    return () => data.subscription.unsubscribe();
  }, []);

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id,name,description,price_usd,image_url,stock,seller_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      setNotice('تعذر تحميل المنتجات. تأكد من إعداد قاعدة البيانات.');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  async function handleAuth(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');

    try {
      if (authMode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        setNotice('تم إرسال طلب التسجيل. تحقق من بريدك الإلكتروني لتأكيد الحساب إذا طُلب منك ذلك.');
        setAuthOpen(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        setNotice('تم تسجيل الدخول بنجاح.');
        setAuthOpen(false);
      }
    } catch (error) {
      setNotice(error.message || 'تعذر إكمال العملية.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    setNotice(error ? error.message : 'تم تسجيل الخروج.');
  }

  const visibleProducts = products.filter((p) => {
    const matchesSearch =
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === 'الكل' || p.category === category;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="app" dir="rtl">
      <div className="announcement">
        <ShieldCheck size={15} />
        <span>سوق NEXORA — اكتشف المنتجات من بائعين معتمدين</span>
      </div>

      <header className="topbar">
        <a className="brand" href="#home" aria-label="NEXORA الرئيسية">
          <span className="brand-mark">N</span>
          <span>
            <strong>NEXORA</strong>
            <small>MARKETPLACE</small>
          </span>
        </a>

        <div className="header-actions">
          {session ? (
            <button className="icon-button" onClick={signOut} title="تسجيل الخروج">
              <UserRound size={20} />
              <span>خروج</span>
            </button>
          ) : (
            <button
              className="icon-button"
              onClick={() => {
                setAuthMode('login');
                setAuthOpen(true);
              }}
            >
              <LogIn size={19} />
              <span>دخول</span>
            </button>
          )}
          <a href="#products" className="bag-button">
            <ShoppingBag size={19} />
            <span>تسوّق</span>
          </a>
        </div>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">
              <span className="live-dot" /> عالم جديد للتسوّق
            </span>
            <h1>
              كل ما تبحث عنه،
              <br />
              <span>في مكان واحد.</span>
            </h1>
            <p>
              اكتشف منتجات متنوعة، وتسوّق من متاجر مستقلة،
              مع تجربة بسيطة وواضحة.
            </p>
            <a className="primary-button" href="#products">
              اكتشف المنتجات <ArrowLeft size={18} />
            </a>
            <div className="hero-trust">
              <span><ShieldCheck size={16} /> بائعون تتم مراجعتهم</span>
              <span><Globe2 size={16} /> سوريا أولًا</span>
            </div>
          </div>

          <div className="hero-art" aria-label="تصميم زخرفي للتسوق">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="hero-package">
              <ShoppingBag size={74} strokeWidth={1.2} />
              <span>NEXORA</span>
            </div>
            <div className="floating-card card-top">✦ اختيارات مميزة</div>
            <div className="floating-card card-bottom">🛍️ اكتشف شيئًا جديدًا</div>
          </div>
        </section>

        <section className="stats-strip">
          <div><Store /><strong>متاجر متعددة</strong><span>تحت مراجعة الإدارة</span></div>
          <div><Package /><strong>منتجات متنوعة</strong><span>تُضاف من البائعين المعتمدين</span></div>
          <div><Headphones /><strong>فريق الدعم</strong><span>لمساعدتك عند الحاجة</span></div>
        </section>

        <section className="section categories-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">تصفّح بسهولة</span>
              <h2>الأقسام</h2>
            </div>
          </div>
          <div className="category-grid">
            <button
              className={`category-card ${category === 'الكل' ? 'selected' : ''}`}
              onClick={() => setCategory('الكل')}
            >
              <span>✦</span><strong>كل المنتجات</strong>
            </button>
            {categories.map((item) => (
              <button
                className={`category-card ${category === item.name ? 'selected' : ''}`}
                key={item.name}
                onClick={() => setCategory(item.name)}
              >
                <span>{item.icon}</span><strong>{item.name}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="section products-section" id="products">
          <div className="section-heading products-heading">
            <div>
              <span className="section-kicker">اختيارات المتاجر</span>
              <h2>اكتشف المنتجات</h2>
              <p>الأسعار معروضة بالدولار الأمريكي.</p>
            </div>
            <div className="search-box">
              <Search size={19} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن منتج..."
                aria-label="البحث عن منتج"
              />
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="loader" />
              <p>جارٍ تحميل المنتجات...</p>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><ShoppingBag size={30} /></div>
              <h3>لا توجد منتجات للعرض حاليًا</h3>
              <p>عندما يضيف البائعون المعتمدون منتجاتهم، ستظهر هنا.</p>
              <button className="outline-button" onClick={loadProducts}>
                تحديث المنتجات
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {visibleProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} loading="lazy" />
                    ) : (
                      <div className="product-placeholder"><Package size={42} /></div>
                    )}
                    <span className="product-label">من متجر مستقل</span>
                  </div>
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <p>{product.description || 'تفاصيل المنتج متاحة عند الاستفسار.'}</p>
                    <div className="product-bottom">
                      <strong>${Number(product.price_usd).toFixed(2)}</strong>
                      <button
                        className="outline-button"
                        onClick={() => setNotice('الشراء والدفع غير مفعّلين بعد. تواصل مع الإدارة قبل أي تحويل مالي.')}
                      >
                        التفاصيل
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="seller-banner">
          <div className="seller-symbol"><Store size={30} /></div>
          <div className="seller-copy">
            <span className="section-kicker">لأصحاب الأعمال</span>
            <h2>هل تريد عرض منتجاتك؟</h2>
            <p>قدّم طلب الانضمام إلى NEXORA. الإدارة تراجع الطلب قبل تفعيل متجرك.</p>
          </div>
          <button
            className="primary-button"
            onClick={() => setNotice('للتقديم كبائع، تواصل مع إدارة NEXORA عبر قناة الدعم الرسمية عند إطلاقها. لا تدفع رسوم انضمام غير معلنة.')}
          >
            طلب الانضمام <ArrowLeft size={18} />
          </button>
        </section>

        <section className="service-grid">
          <div className="service-card">
            <div className="service-icon"><Truck /></div>
            <h3>خدمات التوصيل</h3>
            <p>رسوم التوصيل ستظهر منفصلة عن سعر المنتج عند تفعيل الطلبات.</p>
          </div>
          <div className="service-card">
            <div className="service-icon"><Headphones /></div>
            <h3>الدعم والمساعدة</h3>
            <p>قسم مخصص لمتابعة استفسارات العملاء والبائعين.</p>
          </div>
          <div className="service-card">
            <div className="service-icon"><ShieldCheck /></div>
            <h3>تجربة أكثر أمانًا</h3>
            <p>لن نعرض الدفع على أنه فعّال حتى يتم إعداد آلية موثوقة للتحقق من المدفوعات.</p>
          </div>
        </section>

        <section className="coming-soon">
          <Globe2 size={24} />
          <div>
            <strong>نبدأ من سوريا</strong>
            <p>Coming soon in Iraq and Iran</p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-mark">N</span>
          <span><strong>NEXORA</strong><small>MARKETPLACE</small></span>
        </a>
        <p>سوق إلكتروني قيد التجهيز — الأسعار بالدولار الأمريكي.</p>
        <span>© {new Date().getFullYear()} NEXORA</span>
      </footer>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="إغلاق"><X size={18} /></button>
        </div>
      )}

      {authOpen && (
        <div className="modal-backdrop" onClick={() => setAuthOpen(false)}>
          <section className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="إغلاق">
              <X size={21} />
            </button>
            <div className="auth-logo"><UserRound size={28} /></div>
            <h2>{authMode === 'login' ? 'أهلًا بعودتك' : 'إنشاء حساب جديد'}</h2>
            <p>حسابك على NEXORA Marketplace</p>
            <form onSubmit={handleAuth}>
              {authMode === 'register' && (
                <label>
                  الاسم الكامل
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </label>
              )}
              <label>
                البريد الإلكتروني
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                كلمة المرور
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                />
              </label>
              <button className="primary-button auth-submit" disabled={busy}>
                {busy ? 'يرجى الانتظار...' : authMode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
              </button>
            </form>
            <button
              className="auth-switch"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? (
                <>ليس لديك حساب؟ <strong><UserPlus size={15} /> إنشاء حساب</strong></>
              ) : (
                <>لديك حساب؟ <strong>تسجيل الدخول</strong></>
              )}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
