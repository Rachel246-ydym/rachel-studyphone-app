import { useState, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { Plus, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { TRANSACTION_CATEGORIES } from '../../utils/prompts';
import type { TransactionType, TransactionCategory } from '../../types';
import './Accounting.css';

export default function Accounting() {
  const { state, dispatch } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<TransactionCategory>('food');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthTransactions = useMemo(() => {
    return state.transactions
      .filter(t => t.date.startsWith(selectedMonth))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [state.transactions, selectedMonth]);

  const monthStats = useMemo(() => {
    const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [monthTransactions]);

  // Category breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
      });
    return Object.entries(breakdown)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, total]) => ({
        category: cat,
        label: TRANSACTION_CATEGORIES[cat] || cat,
        total,
        percent: monthStats.expense > 0 ? Math.round((total / monthStats.expense) * 100) : 0,
      }));
  }, [monthTransactions, monthStats.expense]);

  function addTransaction() {
    if (!amount || !description.trim()) return;
    dispatch({
      type: 'ADD_TRANSACTION',
      payload: {
        id: `tx-${Date.now()}`,
        type,
        category,
        amount: Number(amount),
        description: description.trim(),
        date: new Date().toISOString().slice(0, 10),
        timestamp: Date.now(),
      },
    });
    setAmount('');
    setDescription('');
    setShowAdd(false);
  }

  function changeMonth(delta: number) {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const CATEGORY_EMOJIS: Record<string, string> = {
    food: '🍜', transport: '🚌', shopping: '🛍️', entertainment: '🎮',
    education: '📚', medical: '💊', housing: '🏠', salary: '💰', other: '📋',
  };

  return (
    <div className="accounting-page">
      <div className="page-header">
        <h3 style={{ flex: 1 }}>记账</h3>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ padding: '6px 14px', fontSize: 13 }}>
          <Plus size={14} /> 记一笔
        </button>
      </div>

      {/* Month stats */}
      <div className="acc-stats">
        <div className="acc-month-nav">
          <button className="back-btn" onClick={() => changeMonth(-1)}>◀</button>
          <span className="acc-month-label">{selectedMonth.replace('-', '年')}月</span>
          <button className="back-btn" onClick={() => changeMonth(1)}>▶</button>
        </div>
        <div className="acc-summary">
          <div className="acc-stat-card income">
            <TrendingUp size={16} />
            <div>
              <div className="acc-stat-label">收入</div>
              <div className="acc-stat-value">¥{monthStats.income.toFixed(2)}</div>
            </div>
          </div>
          <div className="acc-stat-card expense">
            <TrendingDown size={16} />
            <div>
              <div className="acc-stat-label">支出</div>
              <div className="acc-stat-value">¥{monthStats.expense.toFixed(2)}</div>
            </div>
          </div>
          <div className="acc-stat-card balance">
            <div>
              <div className="acc-stat-label">结余</div>
              <div className="acc-stat-value" style={{ color: monthStats.balance >= 0 ? 'var(--primary)' : '#e03131' }}>
                ¥{monthStats.balance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category chart */}
      {categoryBreakdown.length > 0 && (
        <div className="acc-chart">
          <h4 style={{ fontSize: 14, margin: '0 0 8px' }}>支出分类</h4>
          {categoryBreakdown.map(item => (
            <div key={item.category} className="chart-bar-row">
              <span className="chart-label">{CATEGORY_EMOJIS[item.category]} {item.label}</span>
              <div className="chart-bar-bg">
                <div className="chart-bar-fill" style={{ width: `${item.percent}%` }} />
              </div>
              <span className="chart-value">¥{item.total.toFixed(0)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="acc-add-form">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button className={type === 'expense' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, fontSize: 13 }} onClick={() => setType('expense')}>支出</button>
            <button className={type === 'income' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, fontSize: 13 }} onClick={() => setType('income')}>收入</button>
          </div>
          <div className="form-group">
            <label>金额</label>
            <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" min="0" />
          </div>
          <div className="form-group">
            <label>分类</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(TRANSACTION_CATEGORIES).map(([key, label]) => (
                <button
                  key={key}
                  className={category === key ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '3px 10px', fontSize: 12 }}
                  onClick={() => setCategory(key as TransactionCategory)}
                >{CATEGORY_EMOJIS[key]} {label}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>备注</label>
            <input placeholder="花在了哪里" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setShowAdd(false)}>取消</button>
            <button className="btn-primary" onClick={addTransaction}>保存</button>
          </div>
        </div>
      )}

      {/* Transaction list */}
      <div className="acc-list">
        {monthTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📒</div>
            <p>这个月还没有记账</p>
          </div>
        ) : (
          monthTransactions.map(tx => (
            <div key={tx.id} className="acc-item">
              <div className="acc-item-icon">{CATEGORY_EMOJIS[tx.category]}</div>
              <div className="acc-item-info">
                <div className="acc-item-desc">{tx.description}</div>
                <div className="acc-item-cat">{TRANSACTION_CATEGORIES[tx.category]} · {tx.date}</div>
              </div>
              <div className={`acc-item-amount ${tx.type}`}>
                {tx.type === 'income' ? '+' : '-'}¥{tx.amount.toFixed(2)}
              </div>
              <button className="btn-danger" style={{ padding: '4px 6px' }} onClick={() => dispatch({ type: 'DELETE_TRANSACTION', payload: tx.id })}>
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
