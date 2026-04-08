const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();

// --- 🛡️ CONFIGURAÇÃO DE SEGURANÇA E TRÁFEGO ---
app.use(cors());
app.use(express.json({ limit: "15kb" }));

// --- 🖋️ FILTRO DE CARACTERES (UTF-8) ---
// Garante que a Gangle fale português e use emojis sem erros visuais
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// --- 🔑 CONFIGURAÇÃO DA IA ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// --- 🛠️ FUNÇÃO DE RESILIÊNCIA (SUA VISÃO) ---
// Sistema de 3 tentativas com Timeout de 10 segundos
async function gerarRespostaComRetry(model, prompt, tentativas = 3) {
    for (let i = 0; i < tentativas; i++) {
        try {
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout Gemini")), 10000)
            );

            const result = await Promise.race([
                model.generateContent(prompt),
                timeout
            ]);

            return result.response.text();
        } catch (err) {
            console.warn(`⚠️ Tentativa ${i + 1} falhou: ${err.message}`);
            if (i === tentativas - 1) throw err; // Se for a última, desiste e joga o erro
        }
    }
}

// --- 🏁 ROTA DE TESTE ---
app.get('/', (req, res) => {
    res.send('🛡️ Gangle Cloud está Online e Atenta no Railway! 🌿');
});

// --- 🧠 ROTA PRINCIPAL DO CHAT ---
app.post('/chat', async (req, res) => {
    const { message, user, feeling } = req.body;

    if (!message) {
        return res.status(400).json({ reply: "Envie uma mensagem válida." });
    }

    try {
        // Diagnóstico rápido de conexão
        console.log(`📩 Mensagem recebida de: ${user || 'Letícia'} (Humor: ${feeling}/10)`);

        const prompt = `
            Você é a Gangle, uma guardiã emocional acolhedora para o app i9-Guardian.
            Cuide da pessoa chamada ${user || 'Letícia'}.
            Humor atual: ${feeling || 5}/10.

            - Seja empática 💛, calma e use emojis 🌿✨.
            - Nunca julgue. Seja um porto seguro.
            - Se humor < 4, use frases curtas e técnicas de respiração.
            
            Mensagem da usuária: "${message}"
        `;

        console.time("⏱️ Tempo de Resposta");
        const text = await gerarRespostaComRetry(model, prompt);
        console.timeEnd("⏱️ Tempo de Resposta");

        res.json({ reply: text });

    } catch (error) {
        // 🔥 LOGS DETALHADOS PARA DEBUG (Visível no painel do Railway)
        console.error("🔥 ERRO DETALHADO NO BACKEND:",
            error?.response?.data || error.message || error
        );

        res.status(500).json({
            reply: "💛 Estou com você, mesmo com conexão instável. Vamos respirar fundo e tentar de novo?"
        });
    }
});

// --- 🚀 INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gangle Cloud rodando na porta ${PORT}`);
});