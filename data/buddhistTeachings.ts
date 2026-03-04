/**
 * Buddhist Teachings Grounding Data
 * Used for RAG context injection into Gemini Live API system prompt.
 * Sources: Thích Nhất Hạnh's published works (public domain quotes).
 * This data grounds the AI in authentic Buddhist wisdom, reducing hallucination.
 */

export interface Teaching {
    id: string;
    topic: string;
    emotion_trigger: string[];
    text_vi: string;
    text_en: string;
    source: string;
    practice?: string;
}

export const BUDDHIST_TEACHINGS: Teaching[] = [
    // ─── IMPERMANENCE (Vô Thường) — For Sadness/Loss ────────
    {
        id: 'vt-01',
        topic: 'Vô thường',
        emotion_trigger: ['sad', 'lonely'],
        text_vi: 'Đám mây không bao giờ chết. Nó chỉ trở thành mưa, thành tuyết, thành sông. Người thương của bạn cũng vậy — họ chỉ chuyển hóa.',
        text_en: 'A cloud never dies. It becomes rain, snow, a river. Your loved one is the same — they have only transformed.',
        source: 'No Death, No Fear — Thích Nhất Hạnh',
        practice: 'coherent-breathing',
    },
    {
        id: 'vt-02',
        topic: 'Vô thường',
        emotion_trigger: ['sad'],
        text_vi: 'Nhìn bông hoa, bạn thấy đám mây, mặt trời, mưa, đất. Bông hoa không tồn tại riêng lẻ.',
        text_en: 'Looking at a flower, you can see the cloud, the sunshine, the rain, the earth. The flower does not exist separately.',
        source: 'The Heart of Understanding — Thích Nhất Hạnh',
    },
    {
        id: 'vt-03',
        topic: 'Vô thường',
        emotion_trigger: ['sad', 'lonely'],
        text_vi: 'Khi bạn nhìn vào mắt ai đó với sự chánh niệm, bạn sẽ thấy tổ tiên, con cháu, và toàn bộ vũ trụ trong đó.',
        text_en: 'When you look into someone\'s eyes with mindfulness, you see ancestors, descendants, and the whole universe in them.',
        source: 'Teachings on Love — Thích Nhất Hạnh',
    },

    // ─── COMPASSION (Từ Bi) — For Anger/Frustration ──────────
    {
        id: 'tb-01',
        topic: 'Từ bi',
        emotion_trigger: ['stressed', 'anxious'],
        text_vi: 'Khi bạn giận, hãy ôm cơn giận như người mẹ ôm đứa con đang khóc. Bạn không đánh nó, bạn ôm nó.',
        text_en: 'When you are angry, hold your anger like a mother holds a crying baby. You don\'t hit the baby. You hold the baby.',
        source: 'Anger — Thích Nhất Hạnh',
        practice: '4-7-8',
    },
    {
        id: 'tb-02',
        topic: 'Từ bi',
        emotion_trigger: ['stressed', 'confused'],
        text_vi: 'Hiểu được nỗi khổ của người khác là món quà lớn nhất bạn có thể tặng cho họ. Hiểu tức là yêu thương.',
        text_en: 'Understanding someone\'s suffering is the greatest gift you can give them. Understanding is love.',
        source: 'How to Love — Thích Nhất Hạnh',
    },
    {
        id: 'tb-03',
        topic: 'Từ bi',
        emotion_trigger: ['anxious', 'stressed'],
        text_vi: 'Đừng nói khi đang giận. Hãy tập thở. Sau ba ngày, nếu vẫn muốn nói, hãy nói bằng tình thương.',
        text_en: 'Don\'t speak when angry. Practice breathing. After three days, if you still want to speak, speak with love.',
        source: 'Anger — Thích Nhất Hạnh',
        practice: 'box-breathing',
    },

    // ─── PRESENCE (Hiện Pháp Lạc Trú) — For Anxiety ──────────
    {
        id: 'hp-01',
        topic: 'Hiện pháp lạc trú',
        emotion_trigger: ['anxious', 'stressed', 'confused'],
        text_vi: 'Thở vào, tâm tĩnh lặng. Thở ra, miệng mỉm cười. An trú trong hiện tại, giây phút tuyệt vời.',
        text_en: 'Breathing in, I calm body and mind. Breathing out, I smile. Dwelling in the present moment, I know this is the only moment.',
        source: 'Being Peace — Thích Nhất Hạnh',
        practice: '4-7-8',
    },
    {
        id: 'hp-02',
        topic: 'Hiện pháp lạc trú',
        emotion_trigger: ['anxious'],
        text_vi: 'Bước chân bạn trên mặt đất này chính là thiền. Mỗi bước đi, bạn trở về với chính mình.',
        text_en: 'Your steps on this earth are meditation. Each step returns you to yourself.',
        source: 'The Long Road Turns to Joy — Thích Nhất Hạnh',
        practice: 'coherent-breathing',
    },
    {
        id: 'hp-03',
        topic: 'Hiện pháp lạc trú',
        emotion_trigger: ['anxious', 'confused'],
        text_vi: 'Bạn không cần đi đâu xa để tìm bình an. Bình an nằm ngay trong hơi thở này.',
        text_en: 'You don\'t need to go far to find peace. Peace is right here in this breath.',
        source: 'Peace Is Every Step — Thích Nhất Hạnh',
        practice: 'box-breathing',
    },

    // ─── INTERBEING (Tương Tức) — For Loneliness ──────────────
    {
        id: 'tt-01',
        topic: 'Tương tức',
        emotion_trigger: ['lonely', 'seeking'],
        text_vi: 'Bạn không cô đơn. Trong bạn có mẹ, có cha, có tổ tiên, có mặt trời, có mưa. Bạn là tất cả.',
        text_en: 'You are not alone. In you is your mother, your father, your ancestors, the sun, the rain. You are everything.',
        source: 'Interbeing — Thích Nhất Hạnh',
    },
    {
        id: 'tt-02',
        topic: 'Tương tức',
        emotion_trigger: ['lonely'],
        text_vi: 'Một chiếc lá có cả vũ trụ trong nó. Và bạn, bạn cũng vậy.',
        text_en: 'A single leaf contains the whole universe. And you, you are the same.',
        source: 'The Heart of the Buddha\'s Teaching — Thích Nhất Hạnh',
    },
    {
        id: 'tt-03',
        topic: 'Tương tức',
        emotion_trigger: ['lonely', 'sad'],
        text_vi: 'Hãy nhìn cây cổ thụ. Những chiếc lá rụng không mất đi — chúng nuôi gốc rễ để mùa xuân trở lại.',
        text_en: 'Look at the old tree. The fallen leaves do not disappear — they nourish the roots so spring can return.',
        source: 'No Death, No Fear — Thích Nhất Hạnh',
    },

    // ─── JOY & GRATITUDE — For Calm/Joyful states ──────────
    {
        id: 'hh-01',
        topic: 'Hoan hỷ',
        emotion_trigger: ['calm', 'joyful', 'neutral'],
        text_vi: 'Hạnh phúc không phải là đích đến, mà là con đường. Mỗi bước chân là hạnh phúc.',
        text_en: 'Happiness is not a destination but a way of walking. Every step is happiness.',
        source: 'The Art of Living — Thích Nhất Hạnh',
    },
    {
        id: 'hh-02',
        topic: 'Hoan hỷ',
        emotion_trigger: ['calm', 'joyful'],
        text_vi: 'Khi uống trà, chỉ uống trà. Đừng uống những lo âu, sợ hãi hay phiền muộn.',
        text_en: 'When drinking tea, just drink tea. Don\'t drink your worries, fears, or sorrows.',
        source: 'Savor — Thích Nhất Hạnh',
    },

    // ─── MINDFULNESS PRACTICE — For Seeking/Confused ──────────
    {
        id: 'cn-01',
        topic: 'Chánh niệm',
        emotion_trigger: ['seeking', 'confused', 'neutral'],
        text_vi: 'Chánh niệm là khi bạn rửa bát, bạn biết bạn đang rửa bát. Đó là tất cả.',
        text_en: 'Mindfulness is when you wash the dishes, you know you are washing the dishes. That is all.',
        source: 'The Miracle of Mindfulness — Thích Nhất Hạnh',
    },
    {
        id: 'cn-02',
        topic: 'Chánh niệm',
        emotion_trigger: ['confused', 'seeking'],
        text_vi: 'Thiền không phải là trốn tránh cuộc sống. Thiền là nhìn sâu vào cuộc sống.',
        text_en: 'Meditation is not an escape from life. Meditation is looking deeply into life.',
        source: 'The Heart of the Buddha\'s Teaching — Thích Nhất Hạnh',
    },
    {
        id: 'cn-03',
        topic: 'Chánh niệm',
        emotion_trigger: ['seeking', 'neutral', 'calm'],
        text_vi: 'Khi ăn, bạn chỉ cần biết mình đang ăn. Nhai từng miếng với lòng biết ơn mặt trời, đất mẹ và những người đã làm ra thức ăn này.',
        text_en: 'When you eat, just know that you are eating. Chew each bite with gratitude to the sun, the earth, and those who made this food.',
        source: 'How to Eat — Thích Nhất Hạnh',
    },
];

/**
 * Get teachings relevant to a specific emotion
 */
export function getTeachingsForEmotion(emotion: string): Teaching[] {
    return BUDDHIST_TEACHINGS.filter(t => t.emotion_trigger.includes(emotion));
}

/**
 * Get a random teaching for an emotion
 */
export function getRandomTeaching(emotion: string): Teaching | null {
    const relevant = getTeachingsForEmotion(emotion);
    if (relevant.length === 0) return null;
    return relevant[Math.floor(Math.random() * relevant.length)];
}

/**
 * Format teachings as grounding context for system prompt injection
 */
export function formatGroundingContext(emotion: string): string {
    const teachings = getTeachingsForEmotion(emotion);
    if (teachings.length === 0) return '';

    return teachings
        .map(t => `[${t.topic}] "${t.text_vi}" — ${t.source}`)
        .join('\n');
}
