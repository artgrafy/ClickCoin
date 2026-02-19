'use client';
import { useState } from 'react';
import { Mail, Send } from 'lucide-react';

export default function MiniNewsletterForm({ appType = 'coin' }) {
    const [loading, setLoading] = useState(false);
    const API_BASE = appType === 'coin' ? '/clickcoin/api' : '/clickstock/api';

    const handleSubmit = async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/newsletter/subscribe`, {
                method: 'POST',
                body: JSON.stringify({ email }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (res.ok && data.success !== false) {
                alert(data.message);
                e.target.reset();
            } else {
                alert(data.message || data.error || '구독 처리 중 오류가 발생했습니다.');
            }
        } catch (err) {
            alert('연결 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '4px 4px 4px 12px',
            gap: '8px',
            maxWidth: '300px'
        }}>
            <Mail size={16} opacity={0.4} />
            <input
                name="email"
                type="email"
                placeholder="리포트 구독 (Email)"
                required
                disabled={loading}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    fontSize: '0.85rem',
                    outline: 'none',
                    width: '140px'
                }}
            />
            <button
                type="submit"
                disabled={loading}
                style={{
                    background: 'var(--accent-blue)',
                    color: 'white',
                    border: 'none',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    opacity: loading ? 0.7 : 1
                }}
            >
                <Send size={14} />
            </button>
        </form>
    );
}
