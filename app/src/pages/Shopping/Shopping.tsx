import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { ShoppingCart, Coins, Receipt, Tag } from 'lucide-react';
import type { Product, ShoppingReceipt } from '../../types';
import './Shopping.css';

const CATEGORY_LABELS: Record<string, string> = {
  food: '食材',
  daily: '日用品',
  bakery: '面包甜点',
  flowers: '鲜花',
  gifts: '精品礼物',
  adult: '私密用品',
};

export default function Shopping() {
  const { state, dispatch } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showReceipts, setShowReceipts] = useState(false);
  const [buyAs, setBuyAs] = useState<'user' | 'together'>('user');

  const categories = Object.keys(CATEGORY_LABELS).filter(cat => {
    if (cat === 'adult') return state.relationshipStatus === 'lover';
    return true;
  });

  const filteredProducts = state.products.filter(p => {
    if (p.adultOnly && state.relationshipStatus !== 'lover') return false;
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  function addToCart(product: Product) {
    const existing = cart.find(c => c.product.id === product.id);
    if (existing) {
      setCart(cart.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter(c => c.product.id !== productId));
  }

  function getTotalPrice() {
    return cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  }

  function checkout() {
    const total = getTotalPrice();
    if (total > state.userHaibi) return;

    dispatch({ type: 'SPEND_HAIBI', payload: { target: 'user', amount: total } });

    const receipt: ShoppingReceipt = {
      id: `receipt-${Date.now()}`,
      items: cart,
      buyerId: 'user',
      sharedWith: buyAs === 'together' ? 'jiangxun' : undefined,
      totalPrice: total,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_RECEIPT', payload: receipt });
    setCart([]);
    setShowCart(false);
  }

  if (showReceipts) {
    const allReceipts = [...state.receipts].sort((a, b) => b.timestamp - a.timestamp);
    return (
      <div className="shopping-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => setShowReceipts(false)}>
            <Tag size={20} />
          </button>
          <h3 style={{ flex: 1 }}>购物小票</h3>
        </div>
        <div className="receipts-list">
          {allReceipts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🧾</div>
              <p>还没有购物记录</p>
            </div>
          ) : (
            allReceipts.map(r => (
              <div key={r.id} className="receipt-card">
                <div className="receipt-header">
                  <span>{r.buyerId === 'user' ? '我' : '江浔'}购买</span>
                  {r.sharedWith && <span className="receipt-shared">一起逛的</span>}
                  <span className="receipt-time">
                    {new Date(r.timestamp).toLocaleDateString()} {new Date(r.timestamp).toLocaleTimeString().slice(0, 5)}
                  </span>
                </div>
                {r.items.map((item, i) => (
                  <div key={i} className="receipt-item">
                    <span>{item.product.emoji} {item.product.name}</span>
                    <span>x{item.quantity}</span>
                    <span>{item.product.price * item.quantity} 海币</span>
                  </div>
                ))}
                <div className="receipt-total">合计：{r.totalPrice} 海币</div>
                {r.jiangxunComment && (
                  <div className="receipt-comment">江浔：{r.jiangxunComment}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="shopping-page">
      <div className="page-header">
        <h3 style={{ flex: 1 }}>购物</h3>
        <div className="haibi-display">
          <Coins size={16} /> {state.userHaibi} 海币
        </div>
        <button className="header-btn" onClick={() => setShowReceipts(true)} title="购物小票">
          <Receipt size={18} />
        </button>
        <button
          className="header-btn"
          onClick={() => setShowCart(!showCart)}
          style={{ position: 'relative' }}
          title="购物车"
        >
          <ShoppingCart size={18} />
          {cart.length > 0 && (
            <span className="cart-badge">{cart.reduce((s, c) => s + c.quantity, 0)}</span>
          )}
        </button>
      </div>

      <div className="shop-layout">
        {/* Category tabs */}
        <div className="category-tabs">
          <button
            className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >全部</button>
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >{CATEGORY_LABELS[cat]}</button>
          ))}
        </div>

        {/* Product grid */}
        <div className="product-grid">
          {filteredProducts.map(product => (
            <div key={product.id} className="product-card" onClick={() => addToCart(product)}>
              <div className="product-emoji">{product.emoji}</div>
              <div className="product-name">{product.name}</div>
              <div className="product-desc">{product.description}</div>
              <div className="product-price">
                <Coins size={12} /> {product.price}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart panel */}
      {showCart && (
        <div className="cart-panel">
          <div className="cart-header">
            <h4>购物车</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={buyAs === 'user' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '2px 10px', fontSize: 12 }}
                onClick={() => setBuyAs('user')}
              >自己买</button>
              <button
                className={buyAs === 'together' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '2px 10px', fontSize: 12 }}
                onClick={() => setBuyAs('together')}
              >和江浔一起</button>
            </div>
          </div>
          {cart.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-light)', fontSize: 13 }}>
              购物车是空的
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.product.id} className="cart-item">
                  <span>{item.product.emoji} {item.product.name}</span>
                  <span>x{item.quantity}</span>
                  <span>{item.product.price * item.quantity} 海币</span>
                  <button className="btn-danger" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removeFromCart(item.product.id)}>
                    删除
                  </button>
                </div>
              ))}
              <div className="cart-footer">
                <div className="cart-total">合计：{getTotalPrice()} 海币</div>
                <button
                  className="btn-primary"
                  onClick={checkout}
                  disabled={getTotalPrice() > state.userHaibi}
                >
                  {getTotalPrice() > state.userHaibi ? '余额不足' : '结算'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
