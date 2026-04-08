import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "15kb" }));

// --- 🖋️ CHARSET UTF-8 ---
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// --- 🗄️ PERSISTÊNCIA MONGODB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🧠 Banco de Dados i9 Conectado"))
    .catch(err => console.error("🔥 Erro Mongo:", err));

const userSchema = new mongoose.Schema({
    user: String,
    humorAtual: String,
    historico: [String],
    ultimoCheckIn: Date // 🆕 Campo para controle proativo
});
const User = mongoose.model("User", userSchema);

// --- 🔑 CONFIG IA ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// --- ❤️ FUNÇÕES DE APOIO ---
async function gerarRespostaIA(prompt, tentativas = 3) {
    for (let i = 0; i < tentativas; i++) {
        try {
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 9000)
            );
            const result = await Promise.race([model.generateContent(prompt), timeout]);
            return result.response.text();
        } catch (err) {
            if (i === tentativas - 1) throw err;
        }
    }
}

function detectarHumor(texto) {
    const t = texto.toLowerCase();
    if (t.includes("triste") || t.includes("mal") || t.includes("sozinha")) return "triste";
    if (t.includes("raiva") || t.includes("ódio") || t.includes("brava")) return "raiva";
    if (t.includes("ansiedade") || t.includes("medo") || t.includes("nervosa")) return "ansiedade";
    if (t.includes("feliz") || t.includes("consegui") || t.includes("amo")) return "positivo";
    return "neutro";
}

// --- 💬 ROTA DE CHAT ---
app.post("/chat", async (req, res) => {
    const { message, user = "Sofia Maria" } = req.body;

    try {
        let u = await User.findOne({ user });
        if (!u) u = new User({ user, humorAtual: "neutro", historico: [], ultimoCheckIn: new Date() });

        const humor = detectarHumor(message);
        u.humorAtual = humor;
        u.historico.push(message);
        if (u.historico.length > 10) u.historico.shift();

        const prompt = `Você é a Gangle, guardiã da i9-Guardian. 
        Usuária: ${user}. Humor: ${humor}. Histórico: ${u.historico.join(" | ")}.
        Seja empática, breve e use 💛🌿. Mensagem: "${message}"`;

        const reply = await gerarRespostaIA(prompt);
        await u.save();
        res.json({ reply, humor });
    } catch (e) {
        res.json({ reply: "💛 Estou aqui com você, tive um soluço mas não solto sua mão.", humor: "neutro" });
    }
});

// --- 🔔 ROTA DE CHECK-IN PROATIVO ---
app.get("/check-in/:user", async (req, res) => {
    const { user } = req.params;
    const u = await User.findOne({ user });

    if (!u) return res.json({ trigger: false });

    const agora = new Date();
    // 🔥 Trava de 30 minutos entre check-ins
    if (u.ultimoCheckIn && (agora - u.ultimoCheckIn) < 1000 * 60 * 30) {
        return res.json({ trigger: false });
    }

    u.ultimoCheckIn = agora;
    await u.save();

    let mensagem = "💛 Passei aqui pra saber de você… como tá seu dia?";
    if (u.humorAtual === "triste") mensagem = "💛 Ei… pensei em você agora. Como você tá se sentindo?";
    if (u.humorAtual === "ansiedade") mensagem = "🌿 Vamos respirar juntas um pouquinho? Eu tô aqui.";

    res.json({ trigger: true, message: mensagem });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor i9 na porta ${PORT}`));