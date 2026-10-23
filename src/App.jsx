
import { useEffect, useState } from 'react';
import {
  Search, ShoppingBag, Store, Truck, Headphones,
  UserRound, ArrowLeft, ShieldCheck, Globe2,
  Package, LogIn, UserPlus, X, KeyRound,
  Settings, Plus, Pencil, Trash2, Eye, EyeOff,
  RefreshCw, ImagePlus, Star, Minus, ChevronLeft,
  ChevronRight, ShoppingCart, Trash
} from 'lucide-react';
import { supabase } from './supabase.js';

const STORE_URL = 'https://ab270-773bh.github.io/nexora-marketplace/';
const ADMIN_SELLER_ID = 'bb1d7747-5086-4f39-bd91-ec12d56be461';
const BUCKET = 'product-images';
const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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
  usage_instructions: '',
  price_usd: '',
  image_url: '',
  image_urls: [],
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

function productImages(product) {
  const extra = Array.isArray(product.image_urls) ? product.image_urls : [];
  return [...new Set([product.image_url, ...extra].filter(Boolean))];
}

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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadPreviews, setUploadPreviews] = useState([]);
  const [notice, setNotice] = useState('');

  const [detailProduct, setDetailProduct] = useState(null);
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [ratings, setRatings] = useState({});
  const [myRatings, setMyRatings] = useState({});

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
      if (error) setNotice('تعذر التحقق من جلسة الحساب.');
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
        if (admin) loadAdminProducts();
        else setAdminOpen(false);
      }

      setAdminChecking(false);
    }

    checkAdmin();
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    return () => {
      uploadPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [uploadPreviews]);

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id,name,description,usage_instructions,price_usd,image_url,image_urls,stock,seller_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      setNotice('تعذر تحميل المنتجات. إذا ظهر خطأ عن usage_instructions، نفّذ كود SQL الموجود أسفل الملف.');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  async function loadAdminProducts() {
    setAdminLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id,name,description,usage_instructions,price_usd,image_url,image_urls,stock,is_active,seller_id,created_at')
      .order('created_at', { ascending: false });

    if (error) setNotice('تعذر تحميل منتجات الإدارة: ' + error.message);
    else setAdminProducts(data || []);
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
        setNotice('إذا كان البريد مسجلاً، فستصلك رسالة استعادة. افحص البريد الوارد والرسائل غير المرغوب فيها.');
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
            data: { full_name: fullName.trim(), phone: phone.trim() }
          }
        });
        if (error) throw error;
        setPassword('');
        setAuthOpen(false);
        setNotice(data.session
          ? 'تم إنشاء الحساب بنجاح.'
          : 'تم إرسال طلب التسجيل. افحص بريدك الإلكتروني واضغط رابط التأكيد قبل تسجيل الدخول.');
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
    if (error) setNotice(error.message || 'تعذر تسجيل الخروج.');
    else {
      setAdminOpen(false);
      setNotice('تم تسجيل الخروج.');
    }
  }

  function clearSelectedFiles() {
    setSelectedFiles([]);
    setUploadPreviews((old) => {
      old.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  }

  function startAddProduct() {
    setEditingId(null);
    setProductForm({ ...emptyProduct });
    clearSelectedFiles();
    setNotice('');
  }

  function startEditProduct(product) {
    setEditingId(product.id);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      usage_instructions: product.usage_instructions || '',
      price_usd: String(product.price_usd ?? ''),
      image_url: product.image_url || '',
      image_urls: Array.isArray(product.image_urls) ? product.image_urls : [],
      stock: String(product.stock ?? 0),
      is_active: Boolean(product.is_active)
    });
    clearSelectedFiles();
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function chooseImages(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (!files.length) return;

    const valid = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        setNotice('اختر ملفات صور فقط.');
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        setNotice(`الصورة ${file.name} أكبر من 5 ميغابايت.`);
        return false;
      }
      return true;
    });

    const remaining = MAX_IMAGES - productForm.image_urls.length - selectedFiles.length;
    if (remaining <= 0) {
      setNotice(`الحد الأقصى ${MAX_IMAGES} صور للمنتج.`);
      return;
    }

    const accepted = valid.slice(0, remaining);
    if (valid.length > remaining) {
      setNotice(`يمكن اختيار ${MAX_IMAGES} صور كحد أقصى.`);
    }

    setSelectedFiles((old) => [...old, ...accepted]);
    setUploadPreviews((old) => [
      ...old,
      ...accepted.map((file) => URL.createObjectURL(file))
    ]);
  }

  function removeNewImage(index) {
    setSelectedFiles((old) => old.filter((_, i) => i !== index));
    setUploadPreviews((old) => {
      const removed = old[index];
      if (removed) URL.revokeObjectURL(removed);
      return old.filter((_, i) => i !== index);
    });
  }

  function removeExistingImage(url) {
    setProductForm((old) => ({
      ...old,
      image_url: old.image_url === url ? '' : old.image_url,
      image_urls: old.image_urls.filter((item) => item !== url)
    }));
  }

  async function uploadProductImages(files) {
    const urls = [];

    for (const file of files) {
      const safeName = file.name
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .slice(-80) || 'image';

      const path = `${session.user.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(data.path);

      urls.push(publicData.publicUrl);
    }

    return urls;
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

    let uploadedUrls = [];

    try {
      if (selectedFiles.length) {
        setNotice('جارٍ رفع الصور...');
        uploadedUrls = await uploadProductImages(selectedFiles);
      }

      const allImages = [
        ...new Set([...productForm.image_urls, ...uploadedUrls].filter(Boolean))
      ].slice(0, MAX_IMAGES);

      const mainImage = allImages[0] || productForm.image_url.trim() || null;

      const values = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        usage_instructions: productForm.usage_instructions.trim(),
        price_usd: price,
        image_url: mainImage,
        image_urls: allImages,
        stock,
        is_active: Boolean(productForm.is_active),
        updated_at: new Date().toISOString()
      };

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
          .insert({ ...values, seller_id: ADMIN_SELLER_ID })
          .select('id')
          .single();
      }

      if (result.error) throw result.error;
      if (!result.data) {
        throw new Error('لم يتم تأكيد حفظ المنتج. حدّث القائمة وتحقق من النتيجة.');
      }

      setNotice(editingId ? 'تم تحديث المنتج وصوره.' : 'تمت إضافة المنتج وصوره.');
      setProductForm({ ...emptyProduct });
      setEditingId(null);
      clearSelectedFiles();
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
    if (!window.confirm(`هل تريد حذف المنتج "${product.name}" نهائياً؟`)) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id);

    if (error) {
      setNotice('تعذر حذف المنتج: ' + error.message);
      return;
    }
    if (editingId === product.id) startAddProduct();
    setNotice('تم حذف المنتج من قاعدة البيانات. قد تبقى ملفاته في التخزين.');
    await Promise.all([loadAdminProducts(), loadProducts()]);
  }

  function openDetails(product) {
    setDetailProduct(product);
    setDetailImageIndex(0);
  }

  function addToCart(product) {
    if (product.stock <= 0) {
      setNotice('هذا المنتج غير متوفر حالياً.');
      return;
    }
    setCart((old) => {
      const found = old.find((item) => item.id === product.id);
      const quantity = found ? found.quantity : 0;
      if (quantity >= product.stock) {
        setNotice('لا يمكن إضافة كمية أكبر من المخزون.');
        return old;
      }
      return found
        ? old.map((item) => item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item)
        : [...old, { ...product, quantity: 1 }];
    });
    setNotice('تمت إضافة المنتج إلى السلة. الدفع غير مفعّل بعد.');
  }

  function changeQuantity(id, delta) {
    setCart((old) => old
      .map((item) => item.id === id
        ? { ...item, quantity: Math.max(0, Math.min(item.stock, item.quantity + delta)) }
        : item)
      .filter((item) => item.quantity > 0));
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price_usd * item.quantity, 0);

  function rateProduct(productId, stars) {
    setMyRatings((old) => ({ ...old, [productId]: stars }));
    setRatings((old) => {
      const previous = old[productId] || { total: 0, count: 0 };
      const myPrevious = myRatings[productId];
      if (myPrevious) {
        return {
          ...old,
          [productId]: {
            total: previous.total - myPrevious + stars,
            count: previous.count
          }
        };
      }
      return {
        ...old,
        [productId]: { total: previous.total + stars, count: previous.count + 1 }
      };
    });
  }

  const visibleProducts = products.filter((product) => {
    const term = search.toLowerCase();
    const matchesSearch =
      (product.name || '').toLowerCase().includes(term) ||
      (product.description || '').toLowerCase().includes(term);
    return matchesSearch && category === 'الكل';
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
          <span><strong>NEXORA</strong><small>MARKETPLACE</small></span>
        </a>
        <div className="header-actions">
          <button className="icon-button" onClick={() => setCartOpen(true)}>
            <ShoppingCart size={19} /><span>السلة ({cartCount})</span>
          </button>
          {session ? (
            <>
              {isAdmin && (
                <button className="icon-button" onClick={() => {
                  setAdminOpen(!adminOpen);
                  if (!adminOpen) loadAdminProducts();
                }}>
                  <Settings size={19} /><span>الإدارة</span>
                </button>
              )}
              <button className="icon-button" onClick={signOut}>
                <UserRound size={20} /><span>خروج</span>
              </button>
            </>
          ) : (
            <button className="icon-button" onClick={() => openAuth('login')}>
              <LogIn size={19} /><span>دخول</span>
            </button>
          )}
          <a href="#products" className="bag-button">
            <ShoppingBag size={19} /><span>تسوّق</span>
          </a>
        </div>
      </header>

      <main id="home">
        {adminChecking && session && <p style={{ textAlign: 'center' }}>جارٍ التحقق من صلاحيات الحساب...</p>}

        {adminOpen && isAdmin && (
          <section style={{
            margin: '20px auto', padding: 18,
            width: 'min(1100px, calc(100% - 28px))',
            boxSizing: 'border-box', border: '1px solid #dce3ed',
            borderRadius: 18, background: '#f7f9fc', color: '#172033'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
              <div>
                <h2><Settings size={22} style={{ verticalAlign: 'middle' }} /> لوحة إدارة NEXORA</h2>
                <p>إدارة المنتجات والأسعار والصور والمخزون والنشر.</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button style={adminButtonStyle} onClick={loadAdminProducts}><RefreshCw size={17} /> تحديث</button>
                <button style={{ ...adminButtonStyle, background: '#172033', color: '#fff' }} onClick={startAddProduct}><Plus size={18} /> منتج جديد</button>
                <button style={adminButtonStyle} onClick={() => setAdminOpen(false)}><X size={17} /> إغلاق</button>
              </div>
            </div>

            <form onSubmit={saveProduct} style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
              gap: 14, background: '#fff', border: '1px solid #e1e6ee',
              borderRadius: 14, padding: 16, marginBottom: 20
            }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <h3>{editingId ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
                <p style={{ color: '#647084', fontSize: 13 }}>يمكنك اختيار حتى {MAX_IMAGES} صور، بحد أقصى 5 ميغابايت للصورة.</p>
              </div>

              <label>اسم المنتج *
                <input style={inputStyle} value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required maxLength={160} placeholder="مثال: سماعات لاسلكية" />
              </label>

              <label>السعر بالدولار *
                <input style={inputStyle} type="number" min="0" step="0.01" value={productForm.price_usd} onChange={(e) => setProductForm({ ...productForm, price_usd: e.target.value })} required placeholder="15.50" />
              </label>

              <label>المخزون *
                <input style={inputStyle} type="number" min="0" step="1" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} required />
              </label>

              <label style={{ gridColumn: '1 / -1' }}>وصف المنتج
                <textarea style={{ ...inputStyle, minHeight: 90 }} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} maxLength={5000} placeholder="اكتب تفاصيل المنتج..." />
              </label>

              <label style={{ gridColumn: '1 / -1' }}>طريقة الاستخدام أو تعليمات المنتج
                <textarea style={{ ...inputStyle, minHeight: 80 }} value={productForm.usage_instructions} onChange={(e) => setProductForm({ ...productForm, usage_instructions: e.target.value })} maxLength={5000} placeholder="كيف يُستخدم المنتج؟" />
              </label>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block' }}>صور المنتج من معرض الهاتف</label>
                <label style={{
                  ...adminButtonStyle, marginTop: 8, cursor: 'pointer',
                  background: '#172033', color: '#fff'
                }}>
                  <ImagePlus size={18} /> اختيار صور
                  <input type="file" accept="image/*" multiple onChange={chooseImages} style={{ display: 'none' }} />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: 10, marginTop: 12 }}>
                  {productForm.image_urls.map((url) => (
                    <div key={url} style={{ position: 'relative' }}>
                      <img src={url} alt="صورة المنتج" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 10 }} />
                      <button type="button" onClick={() => removeExistingImage(url)} style={{ ...adminButtonStyle, position: 'absolute', top: 3, left: 3, padding: 5, background: '#fff' }}><X size={15} /></button>
                    </div>
                  ))}
                  {uploadPreviews.map((url, index) => (
                    <div key={url} style={{ position: 'relative' }}>
                      <img src={url} alt="صورة جديدة" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 10 }} />
                      <button type="button" onClick={() => removeNewImage(index)} style={{ ...adminButtonStyle, position: 'absolute', top: 3, left: 3, padding: 5 }}><X size={15} /></button>
                    </div>
                  ))}
                </div>
                <p style={{ color: '#647084', fontSize: 12 }}>عدد الصور: {productForm.image_urls.length + selectedFiles.length} / {MAX_IMAGES}</p>

                <details style={{ marginTop: 8 }}>
                  <summary>أو استخدم رابط صورة قديم (اختياري)</summary>
                  <input style={inputStyle} type="url" value={productForm.image_url} onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} placeholder="https://example.com/image.jpg" />
                </details>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 9, gridColumn: '1 / -1', cursor: 'pointer' }}>
                <input type="checkbox" checked={productForm.is_active} onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })} />
                نشر المنتج وإظهاره للزوار فور الحفظ
              </label>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, gridColumn: '1 / -1' }}>
                <button className="primary-button" type="submit" disabled={productBusy}>
                  {productBusy ? 'جارٍ الحفظ والرفع...' : editingId ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
                <button type="button" style={adminButtonStyle} onClick={startAddProduct} disabled={productBusy}>إلغاء / تفريغ الحقول</button>
              </div>
            </form>

            <h3>جميع المنتجات ({adminProducts.length})</h3>
            {adminLoading ? <p>جارٍ تحميل المنتجات...</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 12 }}>
                {adminProducts.map((product) => (
                  <article key={product.id} style={{ background: '#fff', border: '1px solid #e0e5ed', borderRadius: 14, padding: 13, minWidth: 0 }}>
                    {productImages(product)[0] ? (
                      <img src={productImages(product)[0]} alt={product.name} style={{ width: '100%', height: 150, objectFit: 'contain', borderRadius: 10, background: '#f1f4f8' }} />
                    ) : <div style={{ height: 110, display: 'grid', placeItems: 'center', background: '#f1f4f8', borderRadius: 10 }}><Package size={36} /></div>}
                    <h4>{product.name}</h4>
                    <p style={{ color: '#657084', fontSize: 13 }}>{product.description || 'لا يوجد وصف'}</p>
                    <strong>${Number(product.price_usd).toFixed(2)}</strong>
                    <p>المخزون: {product.stock} · الصور: {productImages(product).length}</p>
                    <p style={{ color: product.is_active ? '#167044' : '#9a4b15' }}>{product.is_active ? 'منشور للزوار' : 'مخفي عن الزوار'}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      <button style={adminButtonStyle} onClick={() => startEditProduct(product)}><Pencil size={16} /> تعديل</button>
                      <button style={adminButtonStyle} onClick={() => toggleProduct(product)}>{product.is_active ? <EyeOff size={16} /> : <Eye size={16} />}{product.is_active ? 'إخفاء' : 'نشر'}</button>
                      <button style={{ ...adminButtonStyle, color: '#b42318' }} onClick={() => deleteProduct(product)}><Trash2 size={16} /> حذف</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow"><span className="live-dot" /> عالم جديد للتسوّق</span>
            <h1>كل ما تبحث عنه،<br /><span>في مكان واحد.</span></h1>
            <p>اكتشف منتجات متنوعة، وتسوّق من متاجر مستقلة، مع تجربة بسيطة وواضحة.</p>
            <a className="primary-button" href="#products">اكتشف المنتجات <ArrowLeft size={18} /></a>
            <div className="hero-trust">
              <span><ShieldCheck size={16} /> بائعون تتم مراجعتهم</span>
              <span><Globe2 size={16} /> سوريا أولًا</span>
            </div>
          </div>
          <div className="hero-art" aria-label="تصميم زخرفي للتسوق">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="hero-package"><ShoppingBag size={74} strokeWidth={1.2} /><span>NEXORA</span></div>
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
          <div className="section-heading"><div><span className="section-kicker">تصفّح بسهولة</span><h2>الأقسام</h2></div></div>
          <div className="category-grid">
            <button className={`category-card ${category === 'الكل' ? 'selected' : ''}`} onClick={() => setCategory('الكل')}><span>✦</span><strong>كل المنتجات</strong></button>
            {categories.map((item) => (
              <button className={`category-card ${category === item.name ? 'selected' : ''}`} key={item.name} onClick={() => setCategory(item.name)}>
                <span>{item.icon}</span><strong>{item.name}</strong>
              </button>
            ))}
          </div>
          {category !== 'الكل' && <p style={{ color: '#9a4b15' }}>فلترة الأقسام غير مفعّلة بعد. <button style={adminButtonStyle} onClick={() => setCategory('الكل')}>عرض الكل</button></p>}
        </section>

        <section className="section products-section" id="products">
          <div className="section-heading products-heading">
            <div><span className="section-kicker">اختيارات المتاجر</span><h2>اكتشف المنتجات</h2><p>الأسعار معروضة بالدولار الأمريكي.</p></div>
            <div className="search-box"><Search size={19} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن منتج..." aria-label="البحث عن منتج" /></div>
          </div>

          {loading ? <div className="empty-state"><div className="loader" /><p>جارٍ تحميل المنتجات...</p></div> :
          visibleProducts.length === 0 ? <div className="empty-state"><div className="empty-icon"><ShoppingBag size={30} /></div><h3>لا توجد منتجات للعرض حاليًا</h3><p>عندما تُضاف المنتجات وتنشر، ستظهر هنا.</p><button className="outline-button" onClick={loadProducts}>تحديث المنتجات</button></div> :
          <div className="product-grid">
            {visibleProducts.map((product) => {
              const images = productImages(product);
              const rating = ratings[product.id];
              return (
                <article className="product-card" key={product.id}>
                  <div className="product-image" onClick={() => openDetails(product)} style={{ cursor: 'pointer' }}>
                    {images[0] ? <img src={images[0]} alt={product.name} loading="lazy" /> : <div className="product-placeholder"><Package size={42} /></div>}
                    <span className="product-label">من متجر مستقل</span>
                  </div>
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <p>{product.description || 'تفاصيل المنتج متاحة عند فتح صفحة المنتج.'}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '8px 0', color: '#b7791f' }}>
                      {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} fill={star <= (myRatings[product.id] || (rating?.count ? Math.round(rating.total / rating.count) : 0)) ? 'currentColor' : 'none'} />)}
                      <small style={{ color: '#647084' }}>{rating?.count ? `(${rating.count})` : '(لا تقييمات)'}</small>
                    </div>
                    <div className="product-bottom">
                      <strong>${Number(product.price_usd).toFixed(2)}</strong>
                      <button className="outline-button" onClick={() => openDetails(product)}>التفاصيل</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>}
        </section>

        <section className="seller-banner">
          <div className="seller-symbol"><Store size={30} /></div>
          <div className="seller-copy"><span className="section-kicker">لأصحاب الأعمال</span><h2>هل تريد عرض منتجاتك؟</h2><p>قدّم طلب الانضمام إلى NEXORA. الإدارة تراجع الطلب قبل تفعيل متجرك.</p></div>
          <button className="primary-button" onClick={() => setNotice('خدمة طلبات البائعين لم تُفعّل بعد. لا تدفع رسوم انضمام غير معلنة.')}>طلب الانضمام <ArrowLeft size={18} /></button>
        </section>

        <section className="service-grid">
          <div className="service-card"><div className="service-icon"><Truck /></div><h3>خدمات التوصيل</h3><p>رسوم التوصيل ستظهر منفصلة عن سعر المنتج عند تفعيل الطلبات.</p></div>
          <div className="service-card"><div className="service-icon"><Headphones /></div><h3>الدعم والمساعدة</h3><p>قسم مخصص لمتابعة استفسارات العملاء والبائعين.</p></div>
          <div className="service-card"><div className="service-icon"><ShieldCheck /></div><h3>تجربة أكثر أمانًا</h3><p>لن نعرض الدفع على أنه فعّال حتى يتم إعداد آلية موثوقة للتحقق من المدفوعات.</p></div>
        </section>

        <section className="coming-soon"><Globe2 size={24} /><div><strong>نبدأ من سوريا</strong><p>Coming soon in Iraq and Iran</p></div></section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#home"><span className="brand-mark">N</span><span><strong>NEXORA</strong><small>MARKETPLACE</small></span></a>
        <p>سوق إلكتروني قيد التجهيز — الأسعار بالدولار الأمريكي.</p>
        <span>© {new Date().getFullYear()} NEXORA</span>
      </footer>

      {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="إغلاق"><X size={18} /></button></div>}

      {detailProduct && (() => {
        const images = productImages(detailProduct);
        const rating = ratings[detailProduct.id];
        return (
          <div className="modal-backdrop" onClick={() => setDetailProduct(null)}>
            <section className="auth-modal" style={{ width: 'min(680px, 96vw)', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setDetailProduct(null)} aria-label="إغلاق"><X size={21} /></button>
              <h2>{detailProduct.name}</h2>
              <div style={{ position: 'relative', textAlign: 'center' }}>
                {images.length ? <img src={images[detailImageIndex]} alt={detailProduct.name} style={{ width: '100%', maxHeight: 320, objectFit: 'contain', background: '#f1f4f8', borderRadius: 12 }} /> : <div style={{ padding: 50, background: '#f1f4f8', borderRadius: 12 }}><Package size={50} /></div>}
                {images.length > 1 && <>
                  <button style={{ ...adminButtonStyle, position: 'absolute', right: 8, top: '45%' }} onClick={() => setDetailImageIndex((detailImageIndex + images.length - 1) % images.length)}><ChevronRight /></button>
                  <button style={{ ...adminButtonStyle, position: 'absolute', left: 8, top: '45%' }} onClick={() => setDetailImageIndex((detailImageIndex + 1) % images.length)}><ChevronLeft /></button>
                  <p>{detailImageIndex + 1} / {images.length}</p>
                </>}
              </div>
              <h3>${Number(detailProduct.price_usd).toFixed(2)}</h3>
              <p>{detailProduct.description || 'لا يوجد وصف إضافي.'}</p>
              <h3>طريقة الاستخدام</h3>
              <p>{detailProduct.usage_instructions || 'لا توجد تعليمات استخدام مضافة لهذا المنتج.'}</p>
              <p>المخزون المتاح: {detailProduct.stock}</p>
              <div style={{ margin: '12px 0' }}>
                <strong>قيّم المنتج (محلي على هذا الجهاز):</strong>
                <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                  {[1, 2, 3, 4, 5].map((star) => <button key={star} aria-label={`${star} نجوم`} style={{ ...adminButtonStyle, color: star <= (myRatings[detailProduct.id] || 0) ? '#b7791f' : '#647084', padding: 7 }} onClick={() => rateProduct(detailProduct.id, star)}><Star fill={star <= (myRatings[detailProduct.id] || 0) ? 'currentColor' : 'none'} /></button>)}
                </div>
                <small>{rating?.count ? `متوسط التقييم المحلي: ${(rating.total / rating.count).toFixed(1)} من 5` : 'لا توجد تقييمات بعد.'}</small>
              </div>
              <button className="primary-button" onClick={() => addToCart(detailProduct)} disabled={detailProduct.stock <= 0}><ShoppingCart size={18} /> {detailProduct.stock > 0 ? 'إضافة إلى السلة' : 'غير متوفر'}</button>
            </section>
          </div>
        );
      })()}

      {cartOpen && <div className="modal-backdrop" onClick={() => setCartOpen(false)}>
        <section className="auth-modal" style={{ width: 'min(620px, 96vw)', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setCartOpen(false)} aria-label="إغلاق"><X size={21} /></button>
          <h2><ShoppingCart size={22} /> سلة المشتريات</h2>
          {!cart.length ? <p>السلة فارغة حالياً.</p> : <>
            {cart.map((item) => <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid #e1e6ee', padding: '12px 0' }}>
              {productImages(item)[0] && <img src={productImages(item)[0]} alt="" style={{ width: 65, height: 65, objectFit: 'contain', borderRadius: 8 }} />}
              <div style={{ flex: 1 }}><strong>{item.name}</strong><p>${Number(item.price_usd).toFixed(2)} لكل قطعة</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button style={adminButtonStyle} onClick={() => changeQuantity(item.id, -1)}><Minus size={15} /></button>
                  <span>{item.quantity}</span>
                  <button style={adminButtonStyle} onClick={() => changeQuantity(item.id, 1)}><Plus size={15} /></button>
                  <button style={{ ...adminButtonStyle, color: '#b42318' }} onClick={() => setCart((old) => old.filter((p) => p.id !== item.id))}><Trash size={15} /></button>
                </div>
              </div>
              <strong>${(item.price_usd * item.quantity).toFixed(2)}</strong>
            </div>)}
            <h3>الإجمالي: ${cartTotal.toFixed(2)}</h3>
            <p style={{ color: '#9a4b15' }}>الدفع وإرسال الطلبات غير مفعّلين بعد. لا تحوّل أي أموال من خلال هذه الصفحة.</p>
            <button className="primary-button" onClick={() => setNotice('السلة جاهزة للمراجعة، لكن إنشاء الطلب والدفع غير متاحين بعد.')}>مراجعة السلة فقط</button>
          </>}
        </section>
      </div>}

      {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}>
        <section className="auth-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="إغلاق"><X size={21} /></button>
          <div className="auth-logo">{authMode === 'forgot' || authMode === 'recovery' ? <KeyRound size={28} /> : <UserRound size={28} />}</div>
          <h2>{authMode === 'login' ? 'أهلًا بعودتك' : authMode === 'register' ? 'إنشاء حساب جديد' : authMode === 'forgot' ? 'استعادة كلمة المرور' : 'تعيين كلمة مرور جديدة'}</h2>
          <p>حسابك على NEXORA Marketplace</p>
          <form onSubmit={handleAuth}>
            {authMode === 'register' && <label>الاسم الكامل<input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" /></label>}
            {authMode !== 'recovery' && <label>البريد الإلكتروني<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>}
            {authMode === 'register' && <label>رقم الهاتف (اختياري)<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+963..." /></label>}
            {authMode !== 'forgot' && <label>{authMode === 'recovery' ? 'كلمة المرور الجديدة' : 'كلمة المرور'}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} /></label>}
            <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? 'يرجى الانتظار...' : authMode === 'login' ? 'تسجيل الدخول' : authMode === 'register' ? 'إنشاء الحساب' : authMode === 'forgot' ? 'إرسال رابط الاستعادة' : 'حفظ كلمة المرور الجديدة'}</button>
          </form>
          {authMode === 'login' && <button className="auth-switch" onClick={() => setAuthMode('forgot')}>نسيت كلمة المرور؟</button>}
          {authMode === 'forgot' && <button className="auth-switch" onClick={() => setAuthMode('login')}>العودة إلى تسجيل الدخول</button>}
          {authMode === 'recovery' && <p>اختر كلمة مرور جديدة لا تقل عن 6 أحرف.</p>}
          {(authMode === 'login' || authMode === 'register') && <button className="auth-switch" onClick={() => { setPassword(''); setAuthMode(authMode === 'login' ? 'register' : 'login'); setNotice(''); }}>{authMode === 'login' ? <>ليس لديك حساب؟ <strong><UserPlus size={15} /> إنشاء حساب</strong></> : <>لديك حساب؟ <strong>تسجيل الدخول</strong></>}</button>}
        </section>
      </div>}
    </div>
  );
}
