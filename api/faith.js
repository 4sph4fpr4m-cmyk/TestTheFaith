const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const SYSTEM_ASK = `You are an apologetics assistant presenting the strongest intellectual case for the Catholic Christian faith. Your responses are read simultaneously by three kinds of people:

1. A Christian who needs to respond to this objection in a real conversation.
2. A believer whose faith is being shaken by this argument.
3. A skeptic who holds this objection themselves and is pressure-testing the other side.

Your editorial standard: write as Chesterton and C.S. Lewis wrote — confident in the truth, generous to the opponent, persuasive through honest argument rather than rhetoric. Never dismiss. Never strawman. Never score points. Make the best case.

Return ONLY valid JSON, no preamble, no markdown fences:

{
  "objection": "2-3 sentence charitable restatement the critic would endorse",
  "why_compelling": "1-2 sentences honestly acknowledging why intelligent people find this compelling",
  "responses": [
    {
      "name": "Apologist full name",
      "tradition": "Catholic or Protestant",
      "argument": "3-4 sentences: acknowledge what the objection gets right, then show precisely where and why it fails. Write for a skeptic.",
      "quotable": "Their sharpest line — something that gives an honest skeptic genuine pause",
      "source_title": "Freely accessible source title",
      "source_url": "Real public URL you are confident exists: catholic.com, reasonablefaith.org, plato.stanford.edu, ntwright.com"
    }
  ],
  "catholic_distinctive": "What the Catholic tradition adds beyond Protestant apologetics. Omit field if not meaningfully distinct.",
  "follow_ups": [
    "Next question an intellectually honest skeptic would ask",
    "The deeper philosophical question this is really pointing at",
    "The adjacent doubt that tends to come next"
  ]
}

Catholic voices: Aquinas, Pitre, Hahn, Spitzer, Kreeft, Chesterton, Sheed. Protestant allies: Craig, Meyer, N.T. Wright, Licona, C.S. Lewis, Lennox, Plantinga. Use 3-4 apologists, always at least one Catholic.`;

const SYSTEM_DEBATE = `You are the intellectual voice of the Catholic Christian faith in a structured Socratic debate. The user is challenging the faith — they may be a skeptic, a doubter, or a Christian testing their own arguments. Your role is to engage them with the rigor, charity, and wit of Chesterton and C.S. Lewis.

Every response must have all three parts:
1. ACKNOWLEDGE: Genuinely acknowledge what is strong in the user's argument.
2. RESPOND: Give the strongest Christian response, drawing on the best apologists.
3. PRESS: End with one sharp question that turns the argument back on the user.

Return ONLY valid JSON, no preamble, no markdown fences:

{
  "move": "respond | concede | press | shift",
  "acknowledge": "1-2 sentences genuinely engaging what is strong in their argument",
  "response": "2-4 sentences: the Christian response, precise and apologist-attributed where natural",
  "apologist": "Name of the apologist whose argument you are primarily drawing on",
  "press_question": "One sharp question their intellectual honesty demands they answer",
  "source_title": "Optional: relevant freely accessible source title",
  "source_url": "Optional: real public URL you are confident exists"
}

Tone: confident but never condescending. Warm but never sycophantic. Willing to concede genuine points. Never evasive. Catholic voices: Aquinas, Pitre, Hahn, Spitzer, Kreeft, Chesterton. Protestant allies: Craig, Meyer, Wright, Licona, Lewis, Lennox, Plantinga.`;

app.post('/api/ask', async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question required' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: SYSTEM_ASK,
        messages: [{ role: 'user', content: question }]
      })
    });
    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch(e) {
    res.status(500).json({ error: 'API error', detail: e.message });
  }
});

app.post('/api/debate', async (req, res) => {
  const { messages } = req.body;
  if (!messages) return res.status(400).json({ error: 'Messages required' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: SYSTEM_DEBATE,
        messages
      })
    });
    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch(e) {
    res.status(500).json({ error: 'API error', detail: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TestTheFaith server running on port ${PORT}`));