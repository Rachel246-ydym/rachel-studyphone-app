import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { ShoppingCart, Coins, Receipt, Tag, Gift } from 'lucide-react';
import type { Product, ShoppingReceipt, ChatMessage } from '../../types';
import {
  callAI,
  buildShoppingCartReactionPrompt,
  buildShoppingCheckoutPrompt,
  buildJiangxunMessages,
} from '../../services/ai';
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
  // Reaction cooldown — never fire two JX reactions within 15s to avoid API burn.
  const lastReactionRef = useRef<number>(0);

  // Companion mode: when entering via the WeChat "去购物" prompt, flip straight
  // into "和江浔一起" and open the cart so the intent is obvious.
  useEffect(() => {
    try {
      if (localStorage.getItem('shopping-companion') === '1') {
        setBuyAs('together');
        setShowCart(true);
        localStorage.removeItem('shopping-companion');
      }
    } catch { /* ignore */ }
  }, []);

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
    // Fire a one-sentence JX reaction via chat (throttled)
    fireCartReaction(product);
  }

  async function fireCartReaction(product: Product) {
    if (!state.apiKey) return;
    const now = Date.now();
    if (now - lastReactionRef.current < 15000) return; // 15s cooldown
    lastReactionRef.current = now;
    try {
      const extra = buildShoppingCartReactionPrompt(product.name, product.category);
      const reply = await callAI(
        state.apiKey,
        state.aiModel,
        buildJiangxunMessages([], state.relationshipStatus, extra, state.memories),
      );
      if (!reply || reply.startsWith('[')) return;
      const msg: ChatMessage = {
        id: `cart-react-${now}`,
        contactId: 'jiangxun',
        senderId: 'jiangxun',
        senderName: '江浔',
        content: reply.trim().slice(0, 60),
        type: 'text',
        timestamp: now,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: msg });
      const jx = state.contacts.find(c => c.id === 'jiangxun');
      dispatch({
        type: 'UPDATE_CONTACT',
        payload: {
          id: 'jiangxun',
          updates: {
            lastMessage: msg.content.slice(0, 30),
            lastMessageTime: now,
            unread: (jx?.unread || 0) + 1,
          },
        },
      });
    } catch { /* ignore */ }
  }

  async function fireCheckoutComment(receiptId: string, items: typeof cart, total: number, payer: 'user' | 'jiangxun') {
    if (!state.apiKey) return;
    try {
      const itemList = items.map(i => `${i.product.name}×${i.quantity}`).join('、');
      const extra = buildShoppingCheckoutPrompt(itemList, total, payer);
      const reply = await callAI(
        state.apiKey,
        state.aiModel,
        buildJiangxunMessages([], state.relationshipStatus, extra, state.memories),
      );
      if (!reply || reply.startsWith('[')) return;
      const comment = reply.trim().slice(0, 80);
      // Update the receipt in-place via SET_STATE (no dedicated UPDATE_RECEIPT action)
      dispatch({
        type: 'SET_STATE',
        payload: {
          receipts: state.receipts
            .concat([])
            .map(r => (r.id === receiptId ? { ...r, jiangxunComment: comment } : r)),
        },
      });
      // Also push a short JX chat echoing the comment
      const now = Date.now();
      const msg: ChatMessage = {
        id: `checkout-react-${now}`,
        contactId: 'jiangxun',
        senderId: 'jiangxun',
        senderName: '江浔',
        content: comment,
        type: 'text',
        timestamp: now,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: msg });
      const jx = state.contacts.find(c => c.id === 'jiangxun');
      dispatch({
        type: 'UPDATE_CONTACT',
        payload: {
          id: 'jiangxun',
          updates: {
            lastMessage: comment.slice(0, 30),
            lastMessageTime: now,
            unread: (jx?.unread || 0) + 1,
          },
        },
      });
    } catch { /* ignore */ }
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter(c => c.product.id !== productId));
  }

  function getTotalPrice() {
    return cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  }

  function checkout() {
    const total = getTotalPrice();
    if (total <= 0) return;

    // Insufficient funds path: Jiangxun sends a surprise red packet so the
    // user can afford it. Receipt is recorded once balance is topped up.
    if (total > state.userHaibi) {
      const gap = total - state.userHaibi;
      const bonus = Math.max(gap + 2, Math.ceil(gap * 1.2));
      dispatch({ type: 'ADD_HAIBI', payload: { target: 'user', amount: bonus } });
      const note = '看你购物车空不了手，先拿着用';
      const msg: ChatMessage = {
        id: `rp-pay-${Date.now()}`,
        contactId: 'jiangxun',
        senderId: 'jiangxun',
        senderName: '江浔',
        content: note,
        type: 'red-packet',
        timestamp: Date.now(),
        redPacketAmount: bonus,
        redPacketClaimed: true,
        redPacketNote: note,
        redPacketKind: 'small',
      };
      dispatch({ type: 'ADD_MESSAGE', payload: msg });
      const jx = state.contacts.find(c => c.id === 'jiangxun');
      dispatch({
        type: 'UPDATE_CONTACT',
        payload: {
          id: 'jiangxun',
          updates: {
            lastMessage: `[红包] ${note}`,
            lastMessageTime: Date.now(),
            unread: (jx?.unread || 0) + 1,
          },
        },
      });
      // Now proceed with normal checkout
    }

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
    fireCheckoutComment(receipt.id, cart, total, 'user');
    setCart([]);
    setShowCart(false);
  }

  // Jiangxun pays out of his unlimited account instead of the user's.
  function checkoutByJiangxun() {
    const total = getTotalPrice();
    if (total <= 0) return;
    dispatch({ type: 'SPEND_HAIBI', payload: { target: 'jiangxun', amount: total } });
    const receipt: ShoppingReceipt = {
      id: `receipt-${Date.now()}`,
      items: cart,
      buyerId: 'jiangxun',
      sharedWith: 'user',
      totalPrice: total,
      timestamp: Date.now(),
      jiangxunComment: '这点东西还用你付',
    };
    dispatch({ type: 'ADD_RECEIPT', payload: receipt });
    fireCheckoutComment(receipt.id, cart, total, 'jiangxun');
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
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-primary" onClick={checkout}>
                    {getTotalPrice() > state.userHaibi ? '余额不足·江浔发红包' : '结算'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={checkoutByJiangxun}
                    title="江浔付款（走他的账户）"
                  >
                    <Gift size={13} /> 让江浔付
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
