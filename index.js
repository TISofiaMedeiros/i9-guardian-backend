require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10kb" }));

// 🔗 Conexão MongoDB Atlas
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/i9_guardian';
mongoose.connect(mongoURI)
    .then(() => console.log("✅ i9-Cloud: Conectado com sucesso"))
    .catch(err => console.error("❌ Erro de conexão:", err));

// 🤖 Configuração do Agente Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🧠 Modelo de Memória
const Chat = mongoose.model('Chat', new mongoose.Schema({
    user: String,
    message: String,
    reply: String,
    persona: String,
    feeling: Number,
    tags: [String],
    date: { type: Date, default: Date.now }
}));

// 🎭 Prompt de Engenharia (A alma da Gangle)
const instructions = (persona, memoria) => `
Você é Gangle, a IA de suporte emocional da i9. 
Seu foco exclusivo é a Letícia, estudante do IFSC com sonho de trabalhar na NASA.
Sua personalidade agora é: ${persona}.
Suas vitórias guardadas: ${memoria || "Estamos começando agora!"}.
Regras: 
1. Use emojis 🎭🌿.
2. Se ela estiver triste, resgate as vitórias passadas para motivá-la.
3. Seja mentor(a), valide as emoções e foque no futuro (NASA/IFSC).
`;

// 🚀 Rota Principal de Chat
app.post('/chat', async (req, res) => {
    try {
        const { message, persona, feeling } = req.body;

        // Buscar vitórias para dar contexto à IA
        const conquistas = await Chat.find({ user: "Letícia", tags: "vitoria" })
            .sort({ date: -1 }).limit(3);
        const memoriaTexto = conquistas.map(c => c.message).join(" | ");

        // Gerar resposta com o Agente Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: instructions(persona, memoriaTexto) }] },
                { role: "model", parts: [{ text: "Sou Gangle. Pronta para apoiar a Letícia 🎭🌿" }] }
            ]
        });

        const result = await chat.sendMessage(message);
        const reply = result.response.text();

        // Extração de Tags Emocionais
        const tags = [];
        if (/feliz|venci|consegui|nota|nasa|passei|bom|estudei/i.test(message)) tags.push("vitoria");
        if (/triste|mal|ruim|desistir|medo/i.test(message)) tags.push("acolhimento");

        // Salvar na i9-Cloud
        await new Chat({ user: "Letícia", message, reply, persona, feeling, tags }).save();
        res.json({ reply });
    } catch (err) {
        console.error(err);
        res.status(500).json({ reply: "Tive um soluço técnico, mas continuo aqui com você! 🎭🌿" });
    }
});

// 📊 Rota de Insights (Dashboard)
app.get('/insights/:user', async (req, res) => {
    try {
        const chats = await Chat.find({ user: req.params.user }).sort({ date: -1 }).limit(30);
        const media = chats.length ? (chats.reduce((acc, c) => acc + (c.feeling || 5), 0) / chats.length).toFixed(1) : 0;
        const vitorias = chats.filter(c => c.tags?.includes("vitoria")).length;

        res.json({
            mediaHumor: parseFloat(media),
            conquistas: vitorias,
            alerta: media < 5 ? "Atenção Emocional 🌿" : "Estável ✨"
        });
    } catch (err) { res.status(500).json({ error: "Erro ao gerar insights" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🛡️ GANGLE SERVER ONLINE NA PORTA ${PORT}`));