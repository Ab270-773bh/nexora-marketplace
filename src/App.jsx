
import { useEffect, useState } from 'react';
import {
  Search, ShoppingBag, Store, Truck, Headphones,
  UserRound, ArrowLeft, ShieldCheck, Globe2,
  Package, LogIn, UserPlus, X, KeyRound
} from 'lucide-react';
import { supabase } from './supabase.js';

const STORE_URL = 'https://ab270-773bh.github.io/nexora-marketplace/';

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
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadProducts();

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setNotice('تعذر التحقق من جلسة الحساب.');
        return;
      }
      setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('recovery');
        setAuthOpen(true);
        setPassword('');
        setNotice('أدخل كلمة المرور الجديدة لحسابك.');
      }
    });

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

  function openAuth(mode = 'login') {
    setAuthMode(mode);
    setPassword('');
    setNotice('');
    setAuthOpen(true);
  }

  async function handleAuth(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');

    try {
      if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: STORE_URL }
        );

        if (error) throw error;

        setAuthOpen(false);
        setPassword('');
        setNotice(
          'إذا كان البريد مسجلاً، فستصلك رسالة استعادة. افحص البريد الوارد والرسائل غير المرغوب فيها.'
        );
      } else if (authMode === 'recovery') {
        const { error } = await supabase.auth.updateUser({ password });

        if (error) throw error;

        setPassword('');
        setAuthMode('login');
        setAuthOpen(false);
        setNotice('تم تغيير كلمة المرور بنجاح.');
      } else if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: STORE_URL,
            data: {
              full_name: fullName.trim(),
              phone: phone.trim()
            }
          }
        });

        if (error) throw error;

        setPassword('');
        setAuthOpen(false);

        if (data.session) {
          setNotice('تم إنشاء الحساب بنجاح.');
        } else {
          setNotice(
            'تم إرسال طلب التسجيل. افحص بريدك الإلكتروني واضغط رابط التأكيد قبل تسجيل الدخول.'
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;

        setPassword('');
        setAuthOpen(false);
        setNotice('تم تسجيل الدخول بنجاح.');
      }
    } catch (error) {
      setNotice(error.message || 'تعذر إكمال العملية.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setNotice(error.message || 'تعذر تسجيل الخروج.');
    } else {
      setNotice('تم تسجيل الخروج.');
    }
  }

  const visibleProducts = products.filter((product) => {
    const term = search.toLowerCase();

    const matchesSearch =
      (product.name || '').toLowerCase().includes(term) ||
      (product.description || '').toLowerCase().includes(term);

    const matchesCategory =
      category === 'الكل' || product.category === category;

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
            <button
              className="icon-button"
              onClick={signOut}
              title="تسجيل الخروج"
            >
              <UserRound size={20} />
              <span>خروج</span>
            </button>
          ) : (
            <button
              className="icon-button"
              onClick={() => openAuth('login')}
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
                <span>{item.icon}</span>
                <strong>{item.name}</strong>
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
                onChange={(event) => setSearch(event.target.value)}
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
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="product-placeholder">
                        <Package size={42} />
                      </div>
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
                        onClick={() => setNotice(
                          'الشراء والدفع غير مفعّلين بعد. لا تحوّل أي أموال قبل تفعيل نظام دفع موثوق.'
                        )}
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
            onClick={() => setNotice(
              'خدمة طلبات البائعين لم تُفعّل بعد. لا تدفع رسوم انضمام غير معلنة.'
            )}
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
          <button onClick={() => setNotice('')} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
      )}

      {authOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setAuthOpen(false)}
        >
          <section
            className="auth-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setAuthOpen(false)}
              aria-label="إغلاق"
            >
              <X size={21} />
            </button>

            <div className="auth-logo">
              {authMode === 'forgot' || authMode === 'recovery'
                ? <KeyRound size={28} />
                : <UserRound size={28} />}
            </div>

            <h2>
              {authMode === 'login' && 'أهلًا بعودتك'}
              {authMode === 'register' && 'إنشاء حساب جديد'}
              {authMode === 'forgot' && 'استعادة كلمة المرور'}
              {authMode === 'recovery' && 'تعيين كلمة مرور جديدة'}
            </h2>

            <p>حسابك على NEXORA Marketplace</p>

            <form onSubmit={handleAuth}>
              {authMode === 'register' && (
                <label>
                  الاسم الكامل
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    autoComplete="name"
                  />
                </label>
              )}

              {authMode !== 'recovery' && (
                <label>
                  البريد الإلكتروني
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
              )}

              {authMode === 'register' && (
                <label>
                  رقم الهاتف (اختياري)
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    placeholder="+963..."
                  />
                </label>
              )}

              {authMode !== 'forgot' && (
                <label>
                  {authMode === 'recovery' ? 'كلمة المرور الجديدة' : 'كلمة المرور'}
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={6}
                    autoComplete={
                      authMode === 'login'
                        ? 'current-password'
                        : 'new-password'
                    }
                  />
                </label>
              )}

              <button
                className="primary-button auth-submit"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? 'يرجى الانتظار...'
                  : authMode === 'login'
                    ? 'تسجيل الدخول'
                    : authMode === 'register'
                      ? 'إنشاء الحساب'
                      : authMode === 'forgot'
                        ? 'إرسال رابط الاستعادة'
                        : 'حفظ كلمة المرور الجديدة'}
              </button>
            </form>

            {authMode === 'login' && (
              <button
                type="button"
                className="auth-switch"
                onClick={() => {
                  setAuthMode('forgot');
                  setNotice('');
                }}
              >
                نسيت كلمة المرور؟
              </button>
            )}

            {authMode === 'forgot' && (
              <button
                type="button"
                className="auth-switch"
                onClick={() => setAuthMode('login')}
              >
                العودة إلى تسجيل الدخول
              </button>
            )}

            {authMode === 'recovery' && (
              <p>اختر كلمة مرور جديدة لا تقل عن 6 أحرف.</p>
            )}

            {(authMode === 'login' || authMode === 'register') && (
              <button
                type="button"
                className="auth-switch"
                onClick={() => {
                  setPassword('');
                  setAuthMode(
                    authMode === 'login' ? 'register' : 'login'
                  );
                  setNotice('');
                }}
              >
                {authMode === 'login' ? (
                  <>
                    ليس لديك حساب؟{' '}
                    <strong><UserPlus size={15} /> إنشاء حساب</strong>
                  </>
                ) : (
                  <>
                    لديك حساب؟ <strong>تسجيل الدخول</strong>
                  </>
                )}
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
