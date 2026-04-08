const express = require('express');
const cors = require('cors');
// Adicione estas opções para garantir que o navegador não bloqueie
app.use(cors({
    origin: '*', // Permite que qualquer origem fale com o servidor
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();

// --- 🛡️ CONFIGURAÇÃO DE SEGURANÇA E TRÁFEGO ---
app.use(cors());
app.use(express.json({ limit: "15kb" }));

// --- 🖋️ FILTRO DE CARACTERES (UTF-8) ---
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// --- 🔑 CONFIGURAÇÃO DA IA ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 🏁 ROTA DE TESTE ---
app.get('/', (req, res) => {
    res.send('🛡️ Gangle Cloud está Online e Atenta no Railway! 🌿');
});

// --- 🧠 ROTA PRINCIPAL DO CHAT ---
app.post('/chat', async (req, res) => {
    const { message, user, feeling } = req.body;

    // Validação de entrada
    if (!message) {
        return res.status(400).json({ reply: "Envie uma mensagem válida." });
    }

    try {
        // Diagnóstico de Chave no Console do Railway
        console.log("🔑 API KEY STATUS:", process.env.GEMINI_API_KEY ? "OK" : "NÃO DEFINIDA");

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const prompt = `
        Você é a Gangle, uma guardiã emocional acolhedora para o app i9-Guardian.
        Sua missão é cuidar da pessoa chamada ${user || 'Letícia'}.
        Contexto atual: O humor dela está em nível ${feeling || 5}/10.
        
        Diretrizes:
        - Seja extremamente empática, calma e use emojis acolhedores como 💛, 🌿, ✨.
        - Se ela estiver em crise (humor < 4), use frases curtas e valide os sentimentos dela.
        - Nunca julgue. Seja um porto seguro.
        - Responda à mensagem: "${message}"
        `;

        console.time("⏱️ Tempo de Resposta Gemini");
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        console.timeEnd("⏱️ Tempo de Resposta Gemini");

        res.json({ reply: text });

    } catch (error) {
        // 🔥 LOGS DETALHADOS PARA DEBUG NA BANCADA
        console.error("🔥 ERRO DETALHADO NO BACKEND:",
            error?.response?.data || error.message || error
        );

        res.status(500).json({
            reply: "💛 Estou com você, mesmo com conexão instável. Vamos tentar de novo?"
        });
    }
});

// --- 🚀 INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gangle Cloud rodando na porta ${PORT}`);
});