const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

async function checkSubscribers() {
    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
    });

    try {
        const subscribers = await redis.smembers('newsletter_subscribers');
        console.log('\n--- 현재 구독자 목록 ---');
        if (subscribers.length === 0) {
            console.log('아직 구독자가 없습니다.');
        } else {
            subscribers.forEach((email, index) => {
                console.log(`${index + 1}. ${email}`);
            });
            console.log(`\n총 ${subscribers.length}명의 구독자가 있습니다.`);
        }
        console.log('------------------------\n');
    } catch (error) {
        console.error('구독자 목록을 가져오는 중 오류 발생:', error);
    }
}

checkSubscribers();
