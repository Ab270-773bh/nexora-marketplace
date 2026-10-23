
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const ADMIN_SELLER_ID = 'bb1d7747-5086-4f39-bd91-ec12d56be461';

const emptyProduct = {
  name: '',
  description: '',
  price_usd: '',
  image_url: '',
  stock: '10',
  usage_instructions: '',
};

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [adminProducts, setAdminProducts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [myApplication, setMyApplication] = useState(null);

  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [sellerForm, setSellerForm] = useState({
    store_name: '',
    description: '',
  });

  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProductId, setEditingProductId] = useState(null);

  const user = session?.user;
  const isAdmin = profile?.role === 'admin';

  const money = (value) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(value || 0));

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      setNotice('تعذّر تحميل المنتجات: ' + error.message);
      return;
    }

    setProducts(data || []);
  }, []);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setNotice('تعذّر تحميل بيانات الحساب: ' + error.message);
      return;
    }

    setProfile(data);
  }, []);

  const loadAdminProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setNotice('تعذّر تحميل منتجات الإدارة: ' + error.message);
      return;
    }

    setAdminProducts(data || []);
  }, []);

  const loadMyApplication = useCallback(async (userId) => {
    if (!userId) {
      setMyApplication(null);
      return;
    }

    const { data, error } = await supabase
      .from('seller_applications')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      setNotice('تعذّر تحميل طلب المتجر: ' + error.message);
      return;
    }

    setMyApplication(data);
    if (data) {
      setSellerForm({
        store_name: data.store_name || '',
        description: data.description || '',
      });
    }
  }, []);

  const loadApplications = useCallback(async () => {
    const { data, error } = await supabase
      .from('seller_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setNotice('تعذّر تحميل طلبات البائعين: ' + error.message);
      return;
    }

    setApplications(data || []);
  }, []);

  useEffect(() => {
    let alive = true;

    async function initialise() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setNotice('تعذّر التحقق من تسجيل الدخول: ' + error.message);
      }

      if (!alive) return;

      const currentSession = data?.session || null;
      setSession(currentSession);

      if (currentSession?.user) {
        await loadProfile(currentSession.user.id);
        await loadMyApplication(currentSession.user.id);
      }

      await loadProducts();
    }

    initialise();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession || null);

        if (!newSession) {
          setProfile(null);
          setMyApplication(null);
          setApplications([]);
          setAdminProducts([]);
          return;
        }

        // تأجيل طلبات قاعدة البيانات إلى ما بعد معالجة حدث المصادقة.
        setTimeout(() => {
          loadProfile(newSession.user.id);
          loadMyApplication(newSession.user.id);
        }, 0);
      }
    );

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProducts, loadProfile, loadMyApplication]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminProducts();
      loadApplications();
    }
  }, [isAdmin, loadAdminProducts, loadApplications]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) =>
      `${product.name || ''} ${product.description || ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [products, search]);

  async function handleAuth(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');

    try {
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setNotice('تم إنشاء الحساب وتسجيل الدخول.');
        } else {
          setNotice('تم إرسال طلب إنشاء الحساب. تفقد بريدك لتأكيده إذا طُلب منك ذلك.');
        }
      } else if (authMode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: window.location.origin }
        );

        if (error) throw error;
        setNotice('إذا كان البريد مسجلاً، فستصلك رسالة إعادة تعيين كلمة المرور.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        setNotice('تم تسجيل الدخول بنجاح.');
      }
    } catch (error) {
      setNotice('حدث خطأ: ' + (error.message || 'تعذّر إكمال العملية.'));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setNotice('تعذّر تسجيل الخروج: ' + error.message);
      return;
    }

    setSession(null);
    setProfile(null);
    setMyApplication(null);
    setNotice('تم تسجيل الخروج.');
  }

  async function submitSellerApplication(event) {
    event.preventDefault();

    if (!user) {
      setNotice('سجّل الدخول أولاً لتقديم طلب فتح متجر.');
      return;
    }

    if (myApplication) {
      setNotice('لديك طلب متجر مسجل بالفعل.');
      return;
    }

    const storeName = sellerForm.store_name.trim();

    if (storeName.length < 2 || storeName.length > 80) {
      setNotice('اسم المتجر يجب أن يكون بين حرفين و80 حرفاً.');
      return;
    }

    setBusy(true);
    setNotice('');

    try {
      const { data, error } = await supabase
        .from('seller_applications')
        .insert({
          user_id: user.id,
          store_name: storeName,
          description: sellerForm.description.trim(),
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      setMyApplication(data);
      setNotice('تم إرسال طلبك بنجاح. انتظر مراجعة الإدارة.');
    } catch (error) {
      if (error.code === '23505') {
        await loadMyApplication(user.id);
        setNotice('لديك طلب سابق بالفعل.');
      } else {
        setNotice('تعذّر إرسال الطلب: ' + error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function reviewApplication(applicationId, approve) {
    if (!isAdmin) {
      setNotice('هذه العملية متاحة للإدارة فقط.');
      return;
    }

    const application = applications.find((item) => item.id === applicationId);

    if (!application || application.status !== 'pending') {
      setNotice('هذا الطلب غير موجود أو تمت مراجعته مسبقاً.');
      return;
    }

    setBusy(true);
    setNotice('');

    try {
      if (approve) {
        const { error } = await supabase.rpc(
          'approve_seller_application',
          { application_id: applicationId }
        );

        if (error) throw error;
        setNotice('تمت الموافقة على طلب المتجر.');
      } else {
        const { error } = await supabase
          .from('seller_applications')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', applicationId)
          .eq('status', 'pending');

        if (error) throw error;
        setNotice('تم رفض طلب المتجر.');
      }

      await loadApplications();
      await loadAdminProducts();
    } catch (error) {
      setNotice('تعذّرت مراجعة الطلب: ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  function startNewProduct() {
    setEditingProductId(null);
    setProductForm(emptyProduct);
  }

  function startEditProduct(product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price_usd: String(product.price_usd ?? ''),
      image_url: product.image_url || '',
      stock: String(product.stock ?? 0),
      usage_instructions: product.usage_instructions || '',
    });

    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  async function saveProduct(event) {
    event.preventDefault();

    if (!isAdmin) {
      setNotice('إدارة المنتجات متاحة للإدارة فقط.');
      return;
    }

    const price = Number(productForm.price_usd);
    const stock = Number(productForm.stock);

    if (!productForm.name.trim()) {
      setNotice('اكتب اسم المنتج.');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setNotice('أدخل سعراً صحيحاً.');
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setNotice('أدخل كمية مخزون صحيحة.');
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price_usd: price,
      image_url: productForm.image_url.trim(),
      stock,
      usage_instructions: productForm.usage_instructions.trim(),
      is_active: true,
      seller_id: ADMIN_SELLER_ID,
      updated_at: new Date().toISOString(),
    };

    setBusy(true);
    setNotice('');

    try {
      let result;

      if (editingProductId) {
        result = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProductId);
      } else {
        result = await supabase.from('products').insert(payload);
      }

      if (result.error) throw result.error;

      setNotice(editingProductId ? 'تم تحديث المنتج.' : 'تمت إضافة المنتج.');
      startNewProduct();
      await loadProducts();
      await loadAdminProducts();
    } catch (error) {
      setNotice('تعذّر حفظ المنتج: ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleProduct(product) {
    if (!isAdmin) return;

    const { error } = await supabase
      .from('products')
      .update({
        is_active: !product.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id);

    if (error) {
      setNotice('تعذّر تغيير حالة المنتج: ' + error.message);
      return;
    }

    setNotice(product.is_active ? 'تم إخفاء المنتج.' : 'تم تفعيل المنتج.');
    await loadProducts();
    await loadAdminProducts();
  }

  function statusLabel(status) {
    if (status === 'approved') return 'مقبول';
    if (status === 'rejected') return 'مرفوض';
    return 'قيد المراجعة';
  }

  return (
    <div className="nexora" dir="rtl">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #080d18; color: #edf2ff; font-family: Arial, sans-serif; }
        button, input, textarea { font: inherit; }
        button { cursor: pointer; }
        .nexora { min-height: 100vh; background: radial-gradient(circle at top right,#172746 0,#080d18 42%); color: #edf2ff; }
        .wrap { width: min(1120px,94%); margin: auto; }
        .topbar { padding: 18px 0; border-bottom: 1px solid #253149; background: #080d18dd; }
        .topline { display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap; }
        .brand { font-size:27px; font-weight:900; color:#f5c96b; letter-spacing:1px; }
        .muted { color:#aab7d0; }
        .hero { padding:48px 0 26px; }
        .hero h1 { font-size:clamp(30px,6vw,48px); margin:0 0 12px; }
        .gold { color:#f5c96b; }
        .panel { background:#101a2b; border:1px solid #263650; border-radius:18px; padding:20px; margin:20px 0; }
        .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; }
        .product { overflow:hidden; background:#101a2b; border:1px solid #263650; border-radius:16px; }
        .product img { width:100%; height:190px; object-fit:cover; background:#0b1322; }
        .product-body { padding:15px; }
        .product h3 { margin:0 0 8px; }
        .price { color:#f5c96b; font-weight:800; font-size:20px; }
        .btn { border:0; border-radius:10px; padding:11px 15px; font-weight:700; background:#f5c96b; color:#15100a; }
        .btn.secondary { background:#263650; color:#edf2ff; border:1px solid #40516d; }
        .btn.danger { background:#572b39; color:#fff; }
        .btn:disabled { opacity:.55; cursor:not-allowed; }
        .actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
        .field { display:grid; gap:7px; margin:12px 0; }
        .field input, .field textarea, .search { width:100%; padding:12px; border-radius:10px; border:1px solid #354663; background:#09111f; color:#fff; outline:none; }
        .field textarea { min-height:90px; resize:vertical; }
        .row2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
        .notice { padding:12px 14px; border-radius:10px; background:#172844; border:1px solid #354c6d; margin:15px auto; }
        .status { display:inline-block; border-radius:20px; padding:5px 10px; background:#263650; font-size:13px; }
        .application { padding:15px 0; border-bottom:1px solid #2a3950; overflow-wrap:anywhere; }
        .empty { padding:25px; text-align:center; color:#aab7d0; }
        .footer { padding:30px 0; text-align:center; color:#8d9bb5; }
        .small { font-size:13px; overflow-wrap:anywhere; }
        @media(max-width:520px) { .hero { padding-top:30px; } .panel { padding:15px; } }
      `}</style>

      <header className="topbar">
        <div className="wrap topline">
          <div>
            <div className="brand">NEXORA</div>
            <div className="muted small">متجرك الرقمي في مكان واحد</div>
          </div>

          <div className="actions">
            {user ? (
              <>
                <span className="status">{profile?.full_name || user.email}</span>
                <button className="btn secondary" onClick={signOut}>
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <a href="#account">
                <button className="btn">تسجيل الدخول</button>
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="wrap">
        {notice && (
          <div className="notice">
            {notice}
            <button
              className="btn secondary"
              style={{ float: 'left', padding: '4px 9px' }}
              onClick={() => setNotice('')}
            >
              إغلاق
            </button>
          </div>
        )}

        <section className="hero">
          <p className="gold">اكتشف منتجاتنا الرقمية</p>
          <h1>أهلاً بك في <span className="gold">NEXORA</span></h1>
          <p className="muted">
            تصفّح المنتجات المتاحة، أو سجّل حساباً وقدّم طلباً لفتح متجرك الخاص.
          </p>
          <div className="actions">
            <a href="#products"><button className="btn">تصفّح المنتجات</button></a>
            <a href="#seller"><button className="btn secondary">افتح متجرك</button></a>
          </div>
        </section>

        <section id="products" className="panel">
          <div className="topline">
            <div>
              <h2>المنتجات</h2>
              <p className="muted">المنتجات المنشورة في المتجر</p>
            </div>
            <div style={{ minWidth: 'min(100%,240px)' }}>
              <input
                className="search"
                placeholder="ابحث عن منتج..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {visibleProducts.length === 0 ? (
            <div className="empty">لا توجد منتجات مطابقة حالياً.</div>
          ) : (
            <div className="grid">
              {visibleProducts.map((product) => (
                <article className="product" key={product.id}>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} />
                  ) : (
                    <div
                      style={{
                        height: 190,
                        display: 'grid',
                        placeItems: 'center',
                        background: '#0b1322',
                        color: '#f5c96b',
                        fontSize: 28,
                      }}
                    >
                      NEXORA
                    </div>
                  )}
                  <div className="product-body">
                    <h3>{product.name}</h3>
                    <p className="muted">
                      {product.description || 'لا يوجد وصف لهذا المنتج.'}
                    </p>
                    <p className="price">{money(product.price_usd)}</p>
                    <button
                      className="btn"
                      onClick={() => setSelectedProduct(product)}
                    >
                      تفاصيل المنتج
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedProduct && (
          <section className="panel">
            <div className="topline">
              <h2>{selectedProduct.name}</h2>
              <button
                className="btn secondary"
                onClick={() => setSelectedProduct(null)}
              >
                إغلاق التفاصيل
              </button>
            </div>
            {selectedProduct.image_url && (
              <img
                src={selectedProduct.image_url}
                alt={selectedProduct.name}
                style={{
                  width: '100%',
                  maxWidth: 420,
                  maxHeight: 300,
                  objectFit: 'contain',
                  borderRadius: 12,
                }}
              />
            )}
            <p>{selectedProduct.description}</p>
            <p><strong>السعر:</strong> {money(selectedProduct.price_usd)}</p>
            <p>
              <strong>المخزون:</strong>{' '}
              {selectedProduct.stock > 0 ? 'متوفر' : 'غير متوفر حالياً'}
            </p>
            {selectedProduct.usage_instructions && (
              <>
                <h3>طريقة الاستخدام</h3>
                <p>{selectedProduct.usage_instructions}</p>
              </>
            )}
            <p className="muted">
              الشراء والدفع الإلكتروني غير مفعّلين في هذه المرحلة.
            </p>
          </section>
        )}

        <section id="account" className="panel">
          <h2>{user ? 'حسابك' : 'حساب العميل'}</h2>

          {user ? (
            <>
              <p>تم تسجيل الدخول باستخدام: {user.email}</p>
              <p className="muted small">معرّف الحساب: {user.id}</p>
            </>
          ) : (
            <>
              <div className="actions">
                <button
                  className={`btn ${authMode === 'login' ? '' : 'secondary'}`}
                  onClick={() => setAuthMode('login')}
                >
                  تسجيل الدخول
                </button>
                <button
                  className={`btn ${authMode === 'register' ? '' : 'secondary'}`}
                  onClick={() => setAuthMode('register')}
                >
                  إنشاء حساب
                </button>
                <button
                  className={`btn ${authMode === 'reset' ? '' : 'secondary'}`}
                  onClick={() => setAuthMode('reset')}
                >
                  نسيت كلمة المرور
                </button>
              </div>

              <form onSubmit={handleAuth}>
                {authMode === 'register' && (
                  <>
                    <div className="field">
                      <label>الاسم الكامل</label>
                      <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        required
                        maxLength={100}
                      />
                    </div>
                    <div className="field">
                      <label>رقم الهاتف</label>
                      <input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        maxLength={30}
                      />
                    </div>
                  </>
                )}

                <div className="field">
                  <label>البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                {authMode !== 'reset' && (
                  <div className="field">
                    <label>كلمة المرور</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={6}
                      required
                    />
                  </div>
                )}

                <button className="btn" type="submit" disabled={busy}>
                  {busy
                    ? 'يرجى الانتظار...'
                    : authMode === 'register'
                    ? 'إنشاء الحساب'
                    : authMode === 'reset'
                    ? 'إرسال رابط الاستعادة'
                    : 'دخول'}
                </button>
              </form>
            </>
          )}
        </section>

        <section id="seller" className="panel">
          <h2>افتح متجرك على NEXORA</h2>
          <p className="muted">
            أرسل طلبك للإدارة. بعد الموافقة، تتم إضافة حسابك كبائع.
          </p>

          {!user ? (
            <p>سجّل الدخول أولاً، ثم ارجع إلى هذا القسم لتقديم طلبك.</p>
          ) : myApplication ? (
            <>
              <p>
                حالة الطلب:{' '}
                <span className="status">
                  {statusLabel(myApplication.status)}
                </span>
              </p>
              <p><strong>اسم المتجر:</strong> {myApplication.store_name}</p>
              <p className="muted">{myApplication.description}</p>
              {myApplication.status === 'approved' && (
                <p>تمت الموافقة على طلبك. تواصل مع الإدارة بشأن تفعيل إدارة منتجات البائع.</p>
              )}
              {myApplication.status === 'rejected' && (
                <p>تم رفض الطلب. يرجى التواصل مع الإدارة لمعرفة الخطوة التالية.</p>
              )}
            </>
          ) : (
            <form onSubmit={submitSellerApplication}>
              <div className="field">
                <label>اسم المتجر</label>
                <input
                  value={sellerForm.store_name}
                  onChange={(event) =>
                    setSellerForm({
                      ...sellerForm,
                      store_name: event.target.value,
                    })
                  }
                  minLength={2}
                  maxLength={80}
                  required
                  placeholder="اكتب اسم متجرك"
                />
              </div>

              <div className="field">
                <label>وصف المتجر</label>
                <textarea
                  value={sellerForm.description}
                  onChange={(event) =>
                    setSellerForm({
                      ...sellerForm,
                      description: event.target.value,
                    })
                  }
                  maxLength={1000}
                  placeholder="ما المنتجات التي تريد بيعها؟"
                />
              </div>

              <button className="btn" type="submit" disabled={busy}>
                {busy ? 'جارٍ إرسال الطلب...' : 'إرسال طلب فتح متجر'}
              </button>
            </form>
          )}
        </section>

        {isAdmin && (
          <section id="admin" className="panel">
            <h2>لوحة إدارة NEXORA</h2>
            <p className="muted">
              إدارة المنتجات ومراجعة طلبات فتح المتاجر.
            </p>

            <div className="topline">
              <h3>طلبات البائعين ({applications.length})</h3>
              <button
                className="btn secondary"
                onClick={loadApplications}
                disabled={busy}
              >
                تحديث الطلبات
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="empty">لا توجد طلبات حالياً.</div>
            ) : (
              applications.map((application) => (
                <div className="application" key={application.id}>
                  <div className="topline">
                    <h3>{application.store_name}</h3>
                    <span className="status">
                      {statusLabel(application.status)}
                    </span>
                  </div>
                  <p>{application.description || 'لا يوجد وصف.'}</p>
                  <p className="muted small">
                    معرّف المستخدم: {application.user_id}
                  </p>
                  <p className="muted small">
                    تاريخ الطلب:{' '}
                    {application.created_at
                      ? new Date(application.created_at).toLocaleString()
                      : 'غير متوفر'}
                  </p>

                  {application.status === 'pending' && (
                    <div className="actions">
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() =>
                          reviewApplication(application.id, true)
                        }
                      >
                        الموافقة على المتجر
                      </button>
                      <button
                        className="btn danger"
                        disabled={busy}
                        onClick={() =>
                          reviewApplication(application.id, false)
                        }
                      >
                        رفض الطلب
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            <hr style={{ borderColor: '#2a3950', margin: '25px 0' }} />

            <div className="topline">
              <h3>إضافة منتج أو تعديله</h3>
              {editingProductId && (
                <button className="btn secondary" onClick={startNewProduct}>
                  إلغاء التعديل
                </button>
              )}
            </div>

            <form onSubmit={saveProduct}>
              <div className="row2">
                <div className="field">
                  <label>اسم المنتج</label>
                  <input
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        name: event.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label>السعر بالدولار</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.price_usd}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        price_usd: event.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label>الكمية المتوفرة</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={productForm.stock}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        stock: event.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label>رابط صورة المنتج</label>
                <input
                  type="url"
                  value={productForm.image_url}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      image_url: event.target.value,
                    })
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="field">
                <label>وصف المنتج</label>
                <textarea
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      description: event.target.value,
                    })
                  }
                />
              </div>

              <div className="field">
                <label>تعليمات الاستخدام</label>
                <textarea
                  value={productForm.usage_instructions}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      usage_instructions: event.target.value,
                    })
                  }
                />
              </div>

              <button className="btn" type="submit" disabled={busy}>
                {busy
                  ? 'جارٍ الحفظ...'
                  : editingProductId
                  ? 'حفظ تعديلات المنتج'
                  : 'إضافة المنتج'}
              </button>
            </form>

            <h3 style={{ marginTop: 30 }}>
              جميع المنتجات ({adminProducts.length})
            </h3>

            {adminProducts.map((product) => (
              <div className="application" key={product.id}>
                <div className="topline">
                  <strong>{product.name}</strong>
                  <span className="status">
                    {product.is_active ? 'منشور' : 'مخفي'}
                  </span>
                </div>
                <p className="muted">
                  {money(product.price_usd)} · المخزون: {product.stock}
                </p>
                <div className="actions">
                  <button
                    className="btn secondary"
                    onClick={() => startEditProduct(product)}
                  >
                    تعديل
                  </button>
                  <button
                    className="btn secondary"
                    disabled={busy}
                    onClick={() => toggleProduct(product)}
                  >
                    {product.is_active ? 'إخفاء المنتج' : 'نشر المنتج'}
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="wrap">NEXORA © {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
