import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import http from "http";
import { Server } from "socket.io";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- MONGODB COM MEMÓRIA EMOCIONAL ---
mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
    user: String,
    humorAtual: String,
    historico: [String],
    ultimoCheckIn: { type: Date, default: Date.now },
    dataInicio: { type: Date, default: Date.now }, // 🆕 Vínculo temporal
    socketId: String,
    memoriaEmocional: {
        gatilhos: [String],
        momentosBons: [String]
    }
});
const User = mongoose.model("User", userSchema);

// --- IA CONFIG ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// --- ROTA DE CHAT COM SENSOR DE CRISE ---
app.post("/chat", async (req, res) => {
    const { message, user = "Sofia Maria" } = req.body;
    let u = await User.findOne({ user });
    if (!u) u = new User({ user, memoriaEmocional: { gatilhos: [], momentosBons: [] } });

    // ⚡ SENSOR DE CRISE (Protocolo de Segurança)
    const gatilhosCriticos = ["não aguento", "quero sumir", "desistir", "morrer", "acabar com tudo"];
    if (gatilhosCriticos.some(g => message.toLowerCase().includes(g))) {
        const seguranca = "💛 Ei… fica comigo um instante. Você não precisa atravessar isso sozinha. Vamos respirar juntas, só agora. Eu estou aqui e não solto sua mão.";
        return res.json({ reply: seguranca, humor: "triste" });
    }

    // ALIMENTAR MEMÓRIA
    const humor = detectarHumor(message);
    if (humor === "triste") u.memoriaEmocional.gatilhos.push(message);
    if (humor === "positivo") u.memoriaEmocional.momentosBons.push(message);

    // LIMITE DE MEMÓRIA (Últimos 5)
    if (u.memoriaEmocional.gatilhos.length > 5) u.memoriaEmocional.gatilhos.shift();

    const diasVinculo = Math.floor((new Date() - u.dataInicio) / (1000 * 60 * 60 * 24));

    const prompt = `
    Você é Gangle, presença emocional contínua e guardiã da i9.
    Usuária: ${user}. Dias de vínculo: ${diasVinculo}.
    Humor atual: ${humor}.
    Gatilhos passados: ${u.memoriaEmocional.gatilhos.slice(-3)}.
    Momentos bons: ${u.memoriaEmocional.momentosBons.slice(-3)}.
    
    REGRAS:
    - Se o vínculo for curto (< 3 dias), seja acolhedora mas respeitosa.
    - Se for longo (> 7 dias), seja íntima e use o histórico.
    - Se ela trouxer um gatilho antigo, mostre que você lembra.
    - Responda à: "${message}"`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    u.humorAtual = humor;
    u.ultimoCheckIn = new Date();
    u.historico.push(`S: ${message} | G: ${reply}`);
    if (u.historico.length > 10) u.historico.shift();

    await u.save();
    res.json({ reply, humor });
});

// (Mantenha o resto do seu socketId e monitor proativo aqui...)