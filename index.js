import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
app.use(express.json());

// Static (sirve /public)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Home → sirve el chat
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    // Llama a OpenAI (modelo económico y estable)
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: message }],
        temperature: 0.7
      })
    });

    if (!r.ok) {
      const errTxt = await r.text();
      return res.status(r.status).json({ error: 'OpenAI error', detail: errTxt });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? '(sin respuesta)';
    return res.json({ reply });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Kael'Thar-Core online en ${PORT}`));
