const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();

// 🛡️ CONFIGURAÇÃO DE SEGURANÇA E TRÁFEGO
// O CORS permite que o Frontend (Web/Mobile) fale com o Railway
app.use(cors());
app.use(express.json({ limit: "15kb" })); // Limite seguro para textos

// 🔑 CHAVE DO GEMINI (Deve ser configurada no painel 'Variables' do Railway)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🏁 ROTA DE TESTE (Para saber se o Railway está Online)
app.get('/', (req, res) => {
    res.send('🛡️ Gangle Cloud está Online e Atenta no Railway! 🌿');
});

// 🧠 ROTA PRINCIPAL DO CHAT (A INTELIGÊNCIA DA GANGLE)
app.post('/chat', async (req, res) => {
    const { message, user, feeling } = req.body;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Configuração da Persona Empática (A alma da Gangle)
        const prompt = `
      Você é a Gangle, uma guardiã emocional acolhedora para o app i9-Guardian.
      Sua missão é cuidar da pessoa chamada ${user || 'Letícia'}.
      Contexto atual: O humor dela está em nível ${feeling || 5}/10.
      
      Diretrizes:
      - Seja extremamente empática, calma e use emojis acolhedores como 💛, 🌿, ✨.
      - Se ela estiver em crise (humor < 4), use frases curtas, técnicas de respiração e valide os sentimentos dela.
      - Nunca julgue. Seja um porto seguro.
      - Responda à mensagem: "${message}"
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error("Erro no Gemini:", error);
        res.status(500).json({ reply: "💛 Estou com você, mesmo com conexão instável. Vamos tentar de novo?" });
    }
});

// 🚀 START DO SERVIDOR (AJUSTADO PARA O RAILWAY)
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gangle Cloud rodando na porta ${PORT}`);
});