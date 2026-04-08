import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// --- 🗄️ PERSISTÊNCIA MONGODB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🧠 Banco de Dados i9 Conectado"))
    .catch(err => console.error("🔥 Erro Mongo:", err));

const userSchema = new mongoose.Schema({
    user: String,
    humorAtual: String,
    historico: [String],
    ultimoCheckIn: Date,
    notificacaoPendente: String // 🆕 Armazena o "chamado" da IA
});
const User = mongoose.model("User", userSchema);

// --- 🔑 CONFIG IA GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

async function gerarRespostaIA(prompt) {
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (err) {
        return "💛 Passei aqui para te dar um abraço virtual.";
    }
}

// --- 🔥 MONITOR PROATIVO (Lógica Sofia) ---
setInterval(async () => {
    const users = await User.find();
    const agora = new Date();
    for (const u of users) {
        // Se estiver em silêncio por mais de 1 hora (3600000ms)
        if (!u.ultimoCheckIn || (agora - u.ultimoCheckIn) > 3600000) {
            const prompt = `A usuária ${u.user} está ausente. Ela estava com humor ${u.humorAtual}. Chame-a com carinho e brevidade usando 💛🌿.`;
            const mensagem = await gerarRespostaIA(prompt);

            u.notificacaoPendente = mensagem;
            u.ultimoCheckIn = agora;
            await u.save();
            console.log(`🔔 IA gerou chamado para: ${u.user}`);
        }
    }
}, 60000); // Checa a cada minuto

// --- 💬 ROTAS DE COMUNICAÇÃO ---
app.post("/chat", async (req, res) => {
    const { message, user = "Sofia Maria" } = req.body;
    try {
        let u = await User.findOne({ user });
        if (!u) u = new User({ user, humorAtual: "neutro", historico: [], ultimoCheckIn: new Date() });

        const prompt = `Você é a Gangle, guardiã da i9-Guardian. Usuária: ${user}. Responda com carinho: "${message}"`;
        const reply = await gerarRespostaIA(prompt);

        u.historico.push(message);
        if (u.historico.length > 5) u.historico.shift();
        u.ultimoCheckIn = new Date(); // Reseta o tempo de silêncio
        u.notificacaoPendente = null; // Limpa notificações ao interagir
        await u.save();

        res.json({ reply });
    } catch (e) {
        res.status(500).json({ reply: "💛 Conexão instável." });
    }
});

app.get("/check-in/:user", async (req, res) => {
    const u = await User.findOne({ user: req.params.user });
    if (u && u.notificacaoPendente) {
        const msg = u.notificacaoPendente;
        u.notificacaoPendente = null;
        await u.save();
        return res.json({ trigger: true, message: msg });
    }
    res.json({ trigger: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 i9-Guardian Backend Online`));