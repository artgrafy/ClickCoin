'use client';
import { useState } from 'react';

export default function NewsletterForm({ appType = 'coin' }) {
    const [loading, setLoading] = useState(false);
    const [isAgreed, setIsAgreed] = useState(false);
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
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
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
                    disabled={loading || !isAgreed}
                    style={{
                        flex: '1 1 120px',
                        background: 'var(--accent-blue)',
                        color: 'white',
                        border: 'none',
                        padding: '14px 28px',
                        borderRadius: '14px',
                        fontWeight: 700,
                        cursor: isAgreed ? 'pointer' : 'not-allowed',
                        opacity: (loading || !isAgreed) ? 0.5 : 1
                    }}
                >
                    {loading ? '처리 중...' : '신청 하기'}
                </button>
            </form>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '0 10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                    <input
                        type="checkbox"
                        checked={isAgreed}
                        onChange={(e) => setIsAgreed(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                    />
                    <span>[필수] 개인정보 수집 및 이용에 동의합니다.</span>
                </label>
                <a
                    href="https://success365.kr/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textDecoration: 'underline' }}
                >
                    내용보기
                </a>
            </div>
        </div>
    );
}
