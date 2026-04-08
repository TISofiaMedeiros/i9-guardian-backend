require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

// 🔐 SEGURANÇA E ACESSO
// O CORS permite que o celular da Letícia fale com o servidor no Render
app.use(cors());
app.use(express.json({ limit: "10kb" }));

// 🔌 CONEXÃO I9-CLOUD (MONGODB)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ i9-Cloud: Sistema de Memória Conectado'))
    .catch(err => console.error('❌ Erro na i9-Cloud:', err));

// 🧠 CONFIGURAÇÃO DA IA (GEMINI)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🗄️ ESQUEMA DE MEMÓRIA (BANCO DE DADOS)
const ChatSchema = new mongoose.Schema({
    user: String,
    message: String,
    reply: String,
    persona: String,
    feeling: Number,
    tags: [String],
    date: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', ChatSchema);

// 🔍 FILTRO DE EMOÇÕES E VITÓRIAS
function extractTags(message) {
    const tags = [];
    const msg = message.toLowerCase();

    if (/triste|mal|chor|desanim/i.test(msg)) tags.push("triste");
    if (/feliz|consegui|venci|nota|passei|nasa|ifsc/i.test(msg)) tags.push("vitoria");
    if (/ansioso|medo|preocup|nervoso/i.test(msg)) tags.push("ansiedade");

    return tags;
}

// 🛡️ ROTA PRINCIPAL: CHAT COM EMPATIA
app.post('/chat', async (req, res) => {
    try {
        const { message, persona } = req.body;

        if (!message || message.length > 500) {
            return res.status(400).json({ reply: "Mensagem inválida ou muito longa 🌿" });
        }

        // 🔎 BUSCA DE MEMÓRIAS POSITIVAS (VITÓRIAS REAIS)
        const conquistas = await Chat.find({
            user: "Letícia",
            tags: "vitoria"
        }).sort({ date: -1 }).limit(2);

        const memoriasMsg = conquistas.map(c => c.message).join(" | ");

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      Você é a Gangle, a Inteligência Afetiva do ecossistema i9-Guardian.
      Seu objetivo é proteger e motivar a usuária Letícia.

      Sua Persona Atual: ${persona || 'Empática'}

      CONTEXTO DE VITÓRIAS REAIS DA LETÍCIA:
      ${memoriasMsg || "Ainda não registramos vitórias hoje, mas ela é capaz de tudo."}

      MENSAGEM DA LETÍCIA:
      "${message}"

      REGRAS DE RESPOSTA:
      - Seja profundamente empática, mas mantenha a postura de Guardiã.
      - Use emojis como 🎭 e 🌿.
      - Se ela estiver triste ou ansiosa, RELEMBRE as vitórias citadas no contexto acima.
      - Nunca dê respostas genéricas de robô.
    `;

        const result = await model.generateContent(prompt);
        const reply = result.response.text();

        // 💾 SALVANDO NA MEMÓRIA DA i9-CLOUD
        const tags = extractTags(message);

        await new Chat({
            user: "Letícia",
            message,
            reply,
            persona,
            feeling: tags.includes("vitoria") ? 10 : (tags.includes("triste") ? 3 : 7),
            tags
        }).save();

        res.json({ reply });

    } catch (error) {
        console.error("Erro no motor da Gangle:", error);
        res.status(500).json({ reply: "Tive um soluço técnico, mas continuo aqui com você 🛡️🌿" });
    }
});

// 📊 ROTA DE INSIGHTS (DASHBOARD REAL)
app.get('/insights/:usuario', async (req, res) => {
    try {
        const user = req.params.usuario;
        const chats = await Chat.find({ user }).sort({ date: -1 }).limit(50);

        const mediaHumor = chats.length
            ? (chats.reduce((acc, c) => acc + (c.feeling || 5), 0) / chats.length).toFixed(1)
            : 0;

        const conquistas = chats.filter(c => c.tags.includes("vitoria")).length;
        const alerta = mediaHumor < 5 ? "Atenção Emocional ⚠️" : "Estável e Protegida 🌿";

        res.json({
            mediaHumor: parseFloat(mediaHumor),
            conquistas,
            alerta
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao ler insights" });
    }
});

// 🌐 STATUS DO SERVIDOR
app.get('/', (req, res) => {
    res.send('🛡️ Gangle Cloud está Online e Atenta!');
});

// 🚀 START DO MOTOR
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 i9-Guardian rodando na porta ${PORT}`);
});