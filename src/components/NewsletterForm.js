'use client';
import { useState } from 'react';

export default function NewsletterForm({ appType = 'coin' }) {
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
            alert('통합 서버 연결에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', maxWidth: '500px', margin: '0 auto', flexWrap: 'wrap' }}>
            <input
                name="email"
                type="email"
                placeholder="이메일을 입력하세요"
                required
                disabled={loading}
                style={{
                    flex: '1 1 280px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '14px 22px',
                    borderRadius: '14px',
                    color: 'white',
                    fontSize: '0.95rem',
                    outline: 'none'
                }}
            />
            <button
                type="submit"
                disabled={loading}
                style={{
                    flex: '1 1 120px',
                    background: 'var(--accent-blue)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: loading ? 0.7 : 1
                }}
            >
                {loading ? '처리 중...' : '신청 하기'}
            </button>
        </form>
    );
}
