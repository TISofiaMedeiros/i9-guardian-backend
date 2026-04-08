const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();

// --- 🛡️ CONFIG ---
app.use(cors());
app.use(express.json({ limit: "10kb" }));

// --- 🧠 MEMÓRIA SIMPLES (em RAM) ---
const userMemory = {};

// --- 🔑 IA ---
if (!process.env.GEMINI_API_KEY) {
    throw new Error("❌ GEMINI_API_KEY não definida!");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- ❤️ FALLBACK INTELIGENTE ---
function respostaFallback(message, feeling) {
    if (feeling < 4) {
        return "💛 Eu tô aqui com você… respira comigo devagar, tá? Você não está sozinha.";
    }

    if (message.toLowerCase().includes("rejeitada")) {
        return "💛 Ser rejeitada dói muito… mas isso não define quem você é. Você é importante.";
    }

    return "🌿 Tô aqui com você. Me conta mais um pouquinho…";
}

// --- 🔁 RETRY COM TIMEOUT ---
async function gerarResposta(prompt, tentativas = 3) {
    for (let i = 0; i < tentativas; i++) {
        try {
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout Gemini")), 8000)
            );

            const result = await Promise.race([
                model.generateContent(prompt),
                timeout
            ]);

            return result.response.text();

        } catch (err) {
            console.warn(`⚠️ Tentativa ${i + 1} falhou`);

            if (i === tentativas - 1) throw err;
        }
    }
}

// --- 🏁 ROTA TESTE ---
app.get('/', (req, res) => {
    res.send('🛡️ i9-Guardian Backend Online');
});

// --- 🧠 CHAT ---
app.post('/chat', async (req, res) => {
    const { message, user = "Letícia", feeling = 5 } = req.body;

    if (!message) {
        return res.status(400).json({ reply: "Envie uma mensagem válida." });
    }

    // --- 🧠 SALVA MEMÓRIA ---
    if (!userMemory[user]) {
        userMemory[user] = [];
    }

    userMemory[user].push(message);

    // limita memória
    if (userMemory[user].length > 5) {
        userMemory[user].shift();
    }

    const historico = userMemory[user].join("\n");

    // --- ✨ PROMPT INTELIGENTE ---
    const prompt = `
Você é a Gangle, uma IA emocional extremamente empática.

Usuária: ${user}
Humor: ${feeling}/10

Histórico recente:
${historico}

Mensagem atual:
"${message}"

Regras:
- Seja acolhedora, humana e breve
- Use emojis leves 💛🌿✨
- Nunca julgue
- Se humor < 4 → resposta curta + validação emocional
- Crie conexão emocional real
`;

    try {
        console.time("⏱️ Gemini");

        const text = await gerarResposta(prompt);

        console.timeEnd("⏱️ Gemini");

        res.json({ reply: text });

    } catch (error) {
        console.error("🔥 ERRO FINAL:", error.message);

        const fallback = respostaFallback(message, feeling);

        res.json({ reply: fallback });
    }
});

// --- 🚀 START ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});