const { GoogleGenAI } = require('@google/genai');

async function list() {
    const apiKey = "AIzaSyByQPO_tnM-ehRUKl6Mqbo0U6gyfquzgZA";
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.list();
        // response is usually an iterable or has a list property
        console.log(response);
    } catch (e) {
        console.error(e);
    }
}

list();
