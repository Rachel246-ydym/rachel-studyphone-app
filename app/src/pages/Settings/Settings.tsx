import { useState, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { exportData, importData } from '../../services/storage';
import { Save, Upload, Download, Trash2, Image } from 'lucide-react';
import type { AIModel } from '../../types';
import './Settings.css';

export default function Settings() {
  const { state, dispatch } = useApp();
  const [apiKey, setApiKey] = useState(state.apiKey);
  const [showKey, setShowKey] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  function saveApiKey() {
    dispatch({ type: 'SET_API_KEY', payload: apiKey });
  }

  function handleAvatarUpload(target: 'user' | 'jiangxun', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (target === 'user') {
        dispatch({ type: 'UPDATE_USER_PROFILE', payload: { avatar: base64 } });
      } else {
        dispatch({ type: 'UPDATE_JIANGXUN_PROFILE', payload: { avatar: base64 } });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleExport() {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phone-simulator-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const jsonStr = ev.target?.result as string;
      if (importData(jsonStr)) {
        window.location.reload();
      } else {
        alert('导入失败，文件格式不正确');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleClearData() {
    if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
      localStorage.clear();
      window.location.reload();
    }
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h3>设置</h3>
      </div>

      <div className="settings-content">
        {/* API Settings */}
        <div className="settings-section">
          <h4 className="section-title">AI 设置</h4>
          <div className="setting-item">
            <label>DeepSeek API Key</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="输入你的 API Key"
                className="setting-input"
                style={{ flex: 1 }}
              />
              <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setShowKey(!showKey)}>
                {showKey ? '隐藏' : '显示'}
              </button>
              <button className="btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={saveApiKey}>
                <Save size={12} /> 保存
              </button>
            </div>
          </div>
          <div className="setting-item">
            <label>AI 模型</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['deepseek-chat', 'deepseek-reasoner'] as AIModel[]).map(model => (
                <button
                  key={model}
                  className={state.aiModel === model ? 'btn-primary' : 'btn-secondary'}
                  style={{ flex: 1, fontSize: 13, padding: '8px' }}
                  onClick={() => dispatch({ type: 'SET_AI_MODEL', payload: model })}
                >
                  {model === 'deepseek-chat' ? '💬 普通对话' : '🧠 深度推理'}
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                    {model === 'deepseek-chat' ? '更快更便宜' : '更聪明但更慢'}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="setting-item">
            <label>群聊消息上限（每人每轮）</label>
            <input
              type="number"
              min={1}
              max={50}
              value={state.groupChatMessageLimit}
              onChange={e => dispatch({ type: 'SET_GROUP_LIMIT', payload: Number(e.target.value) })}
              className="setting-input"
              style={{ width: 100 }}
            />
          </div>
        </div>

        {/* Profile Settings */}
        <div className="settings-section">
          <h4 className="section-title">个人资料</h4>
          <div className="setting-item">
            <label>我的昵称</label>
            <input
              value={state.userProfile.name}
              onChange={e => dispatch({ type: 'UPDATE_USER_PROFILE', payload: { name: e.target.value } })}
              className="setting-input"
              style={{ width: 200 }}
            />
          </div>
          <div className="setting-item avatar-setting">
            <label>我的头像</label>
            <div className="avatar-preview">
              {state.userProfile.avatar ? (
                <img src={state.userProfile.avatar} alt="" />
              ) : (
                <span>{state.userProfile.name[0]}</span>
              )}
            </div>
            <label className="btn-secondary" style={{ cursor: 'pointer', fontSize: 13 }}>
              <Image size={14} /> 上传
              <input type="file" accept="image/*" onChange={e => handleAvatarUpload('user', e)} style={{ display: 'none' }} />
            </label>
          </div>
          <div className="setting-item avatar-setting">
            <label>江浔头像</label>
            <div className="avatar-preview">
              {state.jiangxunProfile.avatar ? (
                <img src={state.jiangxunProfile.avatar} alt="" />
              ) : (
                <span>浔</span>
              )}
            </div>
            <label className="btn-secondary" style={{ cursor: 'pointer', fontSize: 13 }}>
              <Image size={14} /> 上传
              <input type="file" accept="image/*" onChange={e => handleAvatarUpload('jiangxun', e)} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* Relationship */}
        <div className="settings-section">
          <h4 className="section-title">关系状态</h4>
          <div className="setting-item">
            <div className="relationship-display">
              当前关系：<strong>{state.relationshipStatus === 'lover' ? '❤️ 恋人' : '🤝 最好的朋友'}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>
              关系状态通过与江浔的对话自然变化
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="settings-section">
          <h4 className="section-title">数据管理</h4>
          <div className="setting-actions">
            <button className="btn-primary" onClick={handleExport}>
              <Download size={14} /> 导出数据备份
            </button>
            <button className="btn-secondary" onClick={() => importRef.current?.click()}>
              <Upload size={14} /> 导入数据
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
            <button className="btn-danger" onClick={handleClearData}>
              <Trash2 size={14} /> 清除所有数据
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 8 }}>
            所有数据存储在浏览器本地，清除浏览器数据会丢失。建议定期导出备份。
          </div>
        </div>
      </div>
    </div>
  );
}
