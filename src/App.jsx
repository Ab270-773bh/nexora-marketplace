
import { useEffect, useState } from 'react';
import {
  Search, ShoppingBag, Store, Truck, Headphones,
  UserRound, ArrowLeft, ShieldCheck, Globe2,
  Package, LogIn, UserPlus, X, KeyRound,
  Settings, Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { supabase } from './supabase.js';

const STORE_URL = 'https://ab270-773bh.github.io/nexora-marketplace/';
const ADMIN_SELLER_ID = 'bb1d7747-5086-4f39-bd91-ec12d56be461';

const categories = [
  { name: 'الإلكترونيات', icon: '📱' },
  { name: 'الأزياء', icon: '👕' },
  { name: 'المنزل', icon: '🏠' },
  { name: 'الجمال والعناية', icon: '✨' },
  { name: 'الألعاب', icon: '🎮' },
  { name: 'منتجات متنوعة', icon: '🛍️' }
];

const emptyProduct = {
  name: '',
  description: '',
  price_usd: '',
  image_url: '',
  stock: '0',
  is_active: false
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px',
  borderRadius: '10px',
  border: '1px solid #d5dbe5',
  background: '#fff',
  color: '#172033',
  font: 'inherit',
  marginTop: '6px'
};

const adminButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid #d5dbe5',
  background: '#fff',
  color: '#172033',
  font: 'inherit',
  cursor: 'pointer'
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecking, setAdminChecking] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [productBusy, setProductBusy] = useState(false);

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
      }
      setSession(data?.session || null);
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

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      setIsAdmin(false);
      setAdminChecking(true);

      if (!session?.user?.id) {
        setAdminChecking(false);
        setAdminOpen(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setNotice('تعذر التحقق من صلاحيات الحساب.');
      } else {
        const admin = data?.role === 'admin';
        setIsAdmin(admin);

        if (admin) {
          loadAdminProducts();
        } else {
          setAdminOpen(false);
        }
      }

      setAdminChecking(false);
    }

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [session]);

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

  async function loadAdminProducts() {
    setAdminLoading(true);

    const { data, error } = await supabase
      .from('products')
      .select('id,name,description,price_usd,image_url,stock,is_active,seller_id,created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setNotice('تعذر تحميل منتجات الإدارة: ' + error.message);
    } else {
      setAdminProducts(data || []);
    }

    setAdminLoading(false);
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
      setAdminOpen(false);
      setNotice('تم تسجيل الخروج.');
    }
  }

  function startAddProduct() {
    setEditingId(null);
    setProductForm({ ...emptyProduct });
    setNotice('');
  }

  function startEditProduct(product) {
    setEditingId(product.id);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price_usd: String(product.price_usd ?? ''),
      image_url: product.image_url || '',
      stock: String(product.stock ?? 0),
      is_active: Boolean(product.is_active)
    });
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveProduct(event) {
    event.preventDefault();

    if (!isAdmin || !session?.user?.id) {
      setNotice('هذه العملية متاحة لحساب المدير فقط.');
      return;
    }

    const price = Number(productForm.price_usd);
    const stock = Number(productForm.stock);

    if (!productForm.name.trim()) {
      setNotice('اكتب اسم المنتج.');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setNotice('أدخل سعراً صحيحاً بالدولار.');
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setNotice('المخزون يجب أن يكون عدداً صحيحاً غير سالب.');
      return;
    }

    setProductBusy(true);
    setNotice('');

    const values = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price_usd: price,
      image_url: productForm.image_url.trim() || null,
      stock,
      is_active: Boolean(productForm.is_active),
      updated_at: new Date().toISOString()
    };

    try {
      let result;

      if (editingId) {
        result = await supabase
          .from('products')
          .update(values)
          .eq('id', editingId)
          .select('id')
          .maybeSingle();
      } else {
        result = await supabase
          .from('products')
          .insert({
            ...values,
            seller_id: ADMIN_SELLER_ID
          })
          .select('id')
          .single();
      }

      if (result.error) throw result.error;

      if (!result.data) {
        throw new Error('لم يتم تأكيد حفظ المنتج. حدّث القائمة وتحقق من النتيجة.');
      }

      setNotice(editingId ? 'تم تحديث المنتج بنجاح.' : 'تمت إضافة المنتج بنجاح.');
      setProductForm({ ...emptyProduct });
      setEditingId(null);

      await Promise.all([loadAdminProducts(), loadProducts()]);
    } catch (error) {
      setNotice('تعذر حفظ المنتج: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setProductBusy(false);
    }
  }

  async function toggleProduct(product) {
    if (!isAdmin) return;

    const { error } = await supabase
      .from('products')
      .update({
        is_active: !product.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', product.id);

    if (error) {
      setNotice('تعذر تغيير حالة النشر: ' + error.message);
      return;
    }

    setNotice(product.is_active ? 'تم إخفاء المنتج.' : 'تم نشر المنتج.');
    await Promise.all([loadAdminProducts(), loadProducts()]);
  }

  async function deleteProduct(product) {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `هل تريد حذف المنتج "${product.name}" نهائياً؟`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id);

    if (error) {
      setNotice('تعذر حذف المنتج: ' + error.message);
      return;
    }

    if (editingId === product.id) startAddProduct();

    setNotice('تم حذف المنتج.');
    await Promise.all([loadAdminProducts(), loadProducts()]);
  }

  const visibleProducts = products.filter((product) => {
    const term = search.toLowerCase();

    const matchesSearch =
      (product.name || '').toLowerCase().includes(term) ||
      (product.description || '').toLowerCase().includes(term);

    // جدول المنتجات الحالي لا يحتوي على عمود category.
    const matchesCategory = category === 'الكل';

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
            <>
              {isAdmin && (
                <button
                  className="icon-button"
                  onClick={() => {
                    setAdminOpen(!adminOpen);
                    if (!adminOpen) loadAdminProducts();
                  }}
                  title="لوحة الإدارة"
                >
                  <Settings size={19} />
                  <span>الإدارة</span>
                </button>
              )}

              <button
                className="icon-button"
                onClick={signOut}
                title="تسجيل الخروج"
              >
                <UserRound size={20} />
                <span>خروج</span>
              </button>
            </>
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
        {adminChecking && session && (
          <p style={{ textAlign: 'center', padding: 8 }}>
            جارٍ التحقق من صلاحيات الحساب...
          </p>
        )}

        {adminOpen && isAdmin && (
          <section
            style={{
              margin: '20px auto',
              padding: '18px',
              width: 'min(1100px, calc(100% - 28px))',
              boxSizing: 'border-box',
              border: '1px solid #dce3ed',
              borderRadius: '18px',
              background: '#f7f9fc',
              color: '#172033'
            }}
          >
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 18
            }}>
              <div>
                <h2 style={{ margin: '0 0 6px' }}>
                  <Settings size={22} style={{ verticalAlign: 'middle' }} /> لوحة إدارة NEXORA
                </h2>
                <p style={{ margin: 0, color: '#5d687a' }}>
                  إدارة المنتجات والأسعار والمخزون والنشر.
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button style={adminButtonStyle} onClick={loadAdminProducts}>
                  <RefreshCw size={17} /> تحديث
                </button>
                <button
                  style={{ ...adminButtonStyle, background: '#172033', color: '#fff' }}
                  onClick={startAddProduct}
                >
                  <Plus size={18} /> منتج جديد
                </button>
                <button
                  style={adminButtonStyle}
                  onClick={() => setAdminOpen(false)}
                >
                  <X size={17} /> إغلاق
                </button>
              </div>
            </div>

            <form
              onSubmit={saveProduct}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
                gap: 14,
                background: '#fff',
                border: '1px solid #e1e6ee',
                borderRadius: 14,
                padding: 16,
                marginBottom: 20
              }}
            >
              <div style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ margin: '0 0 4px' }}>
                  {editingId ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                </h3>
                <p style={{ margin: 0, color: '#647084', fontSize: 13 }}>
                  السعر بالدولار الأمريكي. استخدم رابط صورة مباشر إذا توفر.
                </p>
              </div>

              <label>
                اسم المنتج *
                <input
                  style={inputStyle}
                  value={productForm.name}
                  onChange={(e) => setProductForm({
                    ...productForm, name: e.target.value
                  })}
                  required
                  maxLength={160}
                  placeholder="مثال: سماعات لاسلكية"
                />
              </label>

              <label>
                السعر بالدولار *
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price_usd}
                  onChange={(e) => setProductForm({
                    ...productForm, price_usd: e.target.value
                  })}
                  required
                  placeholder="مثال: 15.50"
                />
              </label>

              <label>
                المخزون *
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  step="1"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({
                    ...productForm, stock: e.target.value
                  })}
                  required
                />
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                وصف المنتج
                <textarea
                  style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                  value={productForm.description}
                  onChange={(e) => setProductForm({
                    ...productForm, description: e.target.value
                  })}
                  maxLength={5000}
                  placeholder="اكتب تفاصيل المنتج..."
                />
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                رابط صورة المنتج (اختياري)
                <input
                  style={inputStyle}
                  type="url"
                  value={productForm.image_url}
                  onChange={(e) => setProductForm({
                    ...productForm, image_url: e.target.value
                  })}
                  placeholder="https://example.com/image.jpg"
                />
              </label>

              {productForm.image_url.trim() && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ marginBottom: 8 }}>معاينة الصورة:</p>
                  <img
                    src={productForm.image_url}
                    alt="معاينة المنتج"
                    style={{
                      maxWidth: '100%',
                      width: 180,
                      height: 140,
                      objectFit: 'contain',
                      borderRadius: 12,
                      background: '#eef1f6'
                    }}
                  />
                </div>
              )}

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                gridColumn: '1 / -1',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={productForm.is_active}
                  onChange={(e) => setProductForm({
                    ...productForm, is_active: e.target.checked
                  })}
                />
                نشر المنتج وإظهاره للزوار فور الحفظ
              </label>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                gridColumn: '1 / -1'
              }}>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={productBusy}
                >
                  {productBusy ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
                <button
                  type="button"
                  style={adminButtonStyle}
                  onClick={startAddProduct}
                  disabled={productBusy}
                >
                  إلغاء / تفريغ الحقول
                </button>
              </div>
            </form>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center'
            }}>
              <h3>جميع المنتجات ({adminProducts.length})</h3>
              <span style={{ color: '#647084', fontSize: 13 }}>
                المنشور يظهر في المتجر العام.
              </span>
            </div>

            {adminLoading ? (
              <p>جارٍ تحميل قائمة المنتجات...</p>
            ) : adminProducts.length === 0 ? (
              <div style={{
                padding: 20,
                textAlign: 'center',
                background: '#fff',
                borderRadius: 12
              }}>
                لا توجد منتجات حتى الآن. أضف أول منتج من النموذج أعلاه.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                gap: 12
              }}>
                {adminProducts.map((product) => (
                  <article
                    key={product.id}
                    style={{
                      background: '#fff',
                      border: '1px solid #e0e5ed',
                      borderRadius: 14,
                      padding: 13,
                      minWidth: 0
                    }}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: 150,
                          objectFit: 'contain',
                          borderRadius: 10,
                          background: '#f1f4f8'
                        }}
                      />
                    ) : (
                      <div style={{
                        height: 110,
                        display: 'grid',
                        placeItems: 'center',
                        background: '#f1f4f8',
                        borderRadius: 10
                      }}>
                        <Package size={36} />
                      </div>
                    )}

                    <h4 style={{ margin: '12px 0 6px', overflowWrap: 'anywhere' }}>
                      {product.name}
                    </h4>
                    <p style={{
                      margin: '0 0 8px',
                      color: '#657084',
                      fontSize: 13,
                      overflowWrap: 'anywhere'
                    }}>
                      {product.description || 'لا يوجد وصف'}
                    </p>

                    <p style={{ margin: '6px 0' }}>
                      <strong>${Number(product.price_usd).toFixed(2)}</strong>
                    </p>
                    <p style={{ margin: '6px 0', fontSize: 13 }}>
                      المخزون: {product.stock}
                    </p>
                    <p style={{
                      margin: '6px 0 12px',
                      color: product.is_active ? '#167044' : '#9a4b15',
                      fontSize: 13
                    }}>
                      {product.is_active ? 'منشور للزوار' : 'مخفي عن الزوار'}
                    </p>

                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 7
                    }}>
                      <button
                        style={adminButtonStyle}
                        onClick={() => startEditProduct(product)}
                      >
                        <Pencil size={16} /> تعديل
                      </button>
                      <button
                        style={adminButtonStyle}
                        onClick={() => toggleProduct(product)}
                      >
                        {product.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                        {product.is_active ? 'إخفاء' : 'نشر'}
                      </button>
                      <button
                        style={{ ...adminButtonStyle, color: '#b42318' }}
                        onClick={() => deleteProduct(product)}
                      >
                        <Trash2 size={16} /> حذف
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

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
          {category !== 'الكل' && (
            <p style={{ color: '#9a4b15' }}>
              تصنيف الأقسام يحتاج إضافة عمود category إلى قاعدة البيانات. اعرض كل المنتجات حالياً للبحث بالاسم.
              <button
                style={{ ...adminButtonStyle, marginRight: 8 }}
                onClick={() => setCategory('الكل')}
              >
                عرض الكل
              </button>
            </p>
          )}
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
              <p>عندما تُضاف المنتجات وتنشر، ستظهر هنا.</p>
              <button className="outline-button" onClick={loadProducts}>
                تحديث المنتجات
              </button>
              {isAdmin && (
                <p>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setAdminOpen(true);
                      startAddProduct();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <Plus size={17} /> إضافة أول منتج
                  </button>
                </p>
              )}
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
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
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
