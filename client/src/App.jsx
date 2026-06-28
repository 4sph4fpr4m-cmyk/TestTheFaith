import { useState, useRef, useEffect } from "react";

const API_BASE = "";

export default function App() {
  const [mode, setMode] = useState("ask");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [debateHistory, setDebateHistory] = useState([]);
  const [debateMessages, setDebateMessages] = useState([]);
  const debateEndRef = useRef(null);

  useEffect(() => {
    debateEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [debateMessages]);

  async function handleAsk() {
    if (!question.trim() || loading) return;
    setLoading(true);
    const q = question;
    setQuestion("");
    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setCards((prev) => [{ q, data }, ...prev]);
    } catch (e) {
      alert("Connection error. Is the server running?");
    }
    setLoading(false);
  }

  async function handleDebate() {
    if (!question.trim() || loading) return;
    setLoading(true);
    const userMsg = question;
    setQuestion("");
    const newHistory = [...debateHistory, { role: "user", content: userMsg }];
    setDebateMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setDebateHistory(newHistory);
    try {
      const res = await fetch(`${API_BASE}/api/debate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory }),
      });
      const data = await res.json();
      const assistantContent = JSON.stringify(data);
      setDebateHistory((prev) => [...prev, { role: "assistant", content: assistantContent }]);
      setDebateMessages((prev) => [...prev, { role: "faith", data }]);
    } catch (e) {
      alert("Connection error. Is the server running?");
    }
    setLoading(false);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      mode === "ask" ? handleAsk() : handleDebate();
    }
  }

  function shareCard(card) {
    const text = [
      `Objection: ${card.data.objection}`,
      `\nWhy it has force: ${card.data.why_compelling}`,
      "",
      ...(card.data.responses || []).map((r) => `${r.name} (${r.tradition}):\n${r.quotable}`),
      card.data.catholic_distinctive ? `\nCatholic distinctive: ${card.data.catholic_distinctive}` : "",
      "\n— TestTheFaith.com\n\"Test everything; hold fast to what is good.\" — 1 Thess 5:21",
    ].join("\n").trim();
    navigator.clipboard?.writeText(text);
  }

  const moveLabels = {
    respond: "Responding",
    concede: "Conceding a point",
    press: "Pressing back",
    shift: "Shifting the ground",
  };

  const moveColors = {
    respond: "#2a6b4a",
    concede: "#4a7ab5",
    press: "#c9a84c",
    shift: "#7a3a9a",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f1724", color: "#e8dfc0", fontFamily: "Georgia, serif" }}>
      {/* Header */}
      <div style={{ background: "#1a2744", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid #ffffff18" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#c9a84c", fontSize: 22 }}>✝</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#f0e6c8", letterSpacing: "0.02em" }}>TestTheFaith.com</div>
            <div style={{ fontSize: 12, color: "#7a8fb0", marginTop: 2, fontStyle: "italic" }}>"Test everything; hold fast to what is good." — 1 Thess 5:21</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["ask", "debate"].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: "6px 14px", fontSize: 13, borderRadius: 8, border: "0.5px solid", borderColor: mode === m ? "#c9a84c" : "#ffffff22", background: mode === m ? "#c9a84c22" : "none", color: mode === m ? "#c9a84c" : "#7a8fb0", cursor: "pointer", fontFamily: "Georgia, serif", textTransform: "capitalize" }}>
              {m === "ask" ? "Ask" : "Debate"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>

        {/* Input */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKey}
            placeholder={mode === "ask" ? "State the objection, the doubt, or the argument…" : "Make your case — state your strongest objection…"}
            rows={2}
            style={{ flex: 1, fontSize: 15, padding: "10px 14px", borderRadius: 10, border: "0.5px solid #ffffff22", background: "#1a2744", color: "#f0e6c8", outline: "none", fontFamily: "Georgia, serif", resize: "none", lineHeight: 1.6 }}
          />
          <button
            onClick={mode === "ask" ? handleAsk : handleDebate}
            disabled={loading}
            style={{ padding: "10px 20px", background: "#c9a84c", color: "#1a2744", border: "none", borderRadius: 10, cursor: loading ? "default" : "pointer", fontSize: 14, fontWeight: 700, opacity: loading ? 0.5 : 1, fontFamily: "Georgia, serif" }}
          >
            {loading ? "…" : mode === "ask" ? "Respond ↗" : "Send ↗"}
          </button>
        </div>

        {/* Ask Mode Cards */}
        {mode === "ask" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {cards.length === 0 && !loading && (
              <div style={{ textAlign: "center", color: "#7a8fb0", padding: "60px 20px", lineHeight: 1.8 }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>✝</div>
                <div style={{ fontSize: 15, marginBottom: 8, color: "#a0b0cc" }}>Bring your best argument</div>
                <div style={{ fontSize: 13 }}>State any objection to the Christian faith — a Dawkins argument,<br />an Ehrman claim, or a question that won't leave you alone.</div>
              </div>
            )}
            {loading && (
              <div style={{ textAlign: "center", color: "#7a8fb0", padding: 40 }}>Consulting the tradition…</div>
            )}
            {cards.map((card, i) => (
              <div key={i} style={{ border: "0.5px solid #ffffff18", borderRadius: 12, overflow: "hidden" }}>
                {/* Objection */}
                <div style={{ background: "#1a2744", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7a8fb0", marginBottom: 5 }}>The Objection</div>
                    <div style={{ fontSize: 14, color: "#e8dfc0", lineHeight: 1.65, fontStyle: "italic" }}>{card.data.objection}</div>
                  </div>
                  <button onClick={() => shareCard(card)} style={{ background: "none", border: "0.5px solid #ffffff22", borderRadius: 6, color: "#7a8fb0", fontSize: 11, padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>Share</button>
                </div>

                {/* Why compelling */}
                {card.data.why_compelling && (
                  <div style={{ padding: "10px 18px", background: "#1a274410", borderBottom: "0.5px solid #ffffff10" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7a8fb060", marginBottom: 4 }}>Why This Argument Has Force</div>
                    <div style={{ fontSize: 13, color: "#a0b0cc", lineHeight: 1.65, fontStyle: "italic" }}>{card.data.why_compelling}</div>
                  </div>
                )}

                {/* Responses */}
                <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12, borderBottom: "0.5px solid #ffffff10" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c9a84c" }}>The Christian Response</div>
                  {(card.data.responses || []).map((r, j) => (
                    <div key={j} style={{ background: "#1a2744", border: "0.5px solid #ffffff12", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#f0e6c8" }}>{r.name}</div>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: r.tradition === "Catholic" ? "#c9a84c18" : "#1a274440", color: r.tradition === "Catholic" ? "#c9a84c" : "#4a7ab5", border: `0.5px solid ${r.tradition === "Catholic" ? "#c9a84c44" : "#4a7ab544"}` }}>{r.tradition}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#a0b0cc", lineHeight: 1.7, marginBottom: 10 }}>{r.argument}</div>
                      {r.quotable && (
                        <div style={{ fontSize: 13, color: "#e8dfc0", fontStyle: "italic", padding: "8px 12px", borderLeft: "2px solid #c9a84c", background: "#0f172440", borderRadius: "0 8px 8px 0", marginBottom: 8, lineHeight: 1.6 }}>{r.quotable}</div>
                      )}
                      {r.source_url && (
                        <a href={r.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#4a7ab5", textDecoration: "none" }}>↗ {r.source_title || "Source"}</a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Catholic distinctive */}
                {card.data.catholic_distinctive && (
                  <div style={{ padding: "10px 18px", background: "#c9a84c08", borderBottom: "0.5px solid #ffffff10" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 5 }}>Catholic Distinctive</div>
                    <div style={{ fontSize: 13, color: "#a0b0cc", lineHeight: 1.65 }}>{card.data.catholic_distinctive}</div>
                  </div>
                )}

                {/* Follow ups */}
                {card.data.follow_ups?.length > 0 && (
                  <div style={{ padding: "12px 18px" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7a8fb0", marginBottom: 8 }}>Keep Following the Argument</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {card.data.follow_ups.map((f, j) => (
                        <button key={j} onClick={() => { setQuestion(f); setMode("ask"); }} style={{ textAlign: "left", padding: "8px 12px", fontSize: 13, borderRadius: 8, border: "0.5px solid #ffffff18", background: "none", color: "#a0b0cc", cursor: "pointer", lineHeight: 1.5, fontFamily: "Georgia, serif" }}>
                          <span style={{ color: "#c9a84c", marginRight: 6 }}>→</span>{f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Debate Mode */}
        {mode === "debate" && (
          <div>
            {debateMessages.length === 0 && !loading && (
              <div style={{ textAlign: "center", color: "#7a8fb0", padding: "60px 20px", lineHeight: 1.8 }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>✝</div>
                <div style={{ fontSize: 15, marginBottom: 8, color: "#a0b0cc" }}>Make your case</div>
                <div style={{ fontSize: 13, marginBottom: 24 }}>State your strongest objection. The faith will respond — and press you back.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, margin: "0 auto" }}>
                  {[
                    "Evolution makes God unnecessary",
                    "The Gospels contradict each other",
                    "The problem of evil defeats theism",
                    "We don't need God for morality",
                  ].map((s, i) => (
                    <button key={i} onClick={() => setQuestion(s)} style={{ textAlign: "left", padding: "10px 14px", fontSize: 13, borderRadius: 8, border: "0.5px solid #ffffff18", background: "#1a2744", color: "#a0b0cc", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                      <span style={{ color: "#c9a84c", marginRight: 6 }}>→</span>{s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {debateMessages.map((msg, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 3 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: msg.role === "user" ? "#7a8fb0" : "#c9a84c", paddingLeft: 4 }}>
                    {msg.role === "user" ? "You" : "The Faith"}
                  </div>
                  {msg.role === "user" ? (
                    <div style={{ maxWidth: "80%", background: "#1a2744", color: "#e8dfc0", padding: "10px 14px", borderRadius: "12px 12px 4px 12px", fontSize: 14, lineHeight: 1.65 }}>{msg.text}</div>
                  ) : (
                    <div style={{ maxWidth: "85%", background: "#1a274488", border: "0.5px solid #ffffff18", borderRadius: "12px 12px 12px 4px", padding: "12px 16px", fontSize: 13, lineHeight: 1.7 }}>
                      <span style={{ display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 99, marginBottom: 8, fontWeight: 600, background: `${moveColors[msg.data.move]}22`, color: moveColors[msg.data.move], border: `0.5px solid ${moveColors[msg.data.move]}44` }}>
                        {moveLabels[msg.data.move] || "Responding"}
                      </span>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: "#7a8fb0", fontWeight: 600 }}>Acknowledged: </span>
                        <span style={{ color: "#a0b0cc" }}>{msg.data.acknowledge}</span>
                      </div>
                      <div style={{ color: "#e8dfc0", marginBottom: 10 }}>{msg.data.response}</div>
                      {msg.data.apologist && <div style={{ fontSize: 11, color: "#7a8fb0", marginBottom: 10 }}>— drawing on {msg.data.apologist}</div>}
                      <div style={{ padding: "8px 12px", borderLeft: "2px solid #c9a84c", background: "#0f172440", borderRadius: "0 8px 8px 0", fontSize: 13, color: "#f0e6c8", fontStyle: "italic", lineHeight: 1.6 }}>{msg.data.press_question}</div>
                      {msg.data.source_url && (
                        <a href={msg.data.source_url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 8, fontSize: 11, color: "#4a7ab5", textDecoration: "none" }}>↗ {msg.data.source_title || "Source"}</a>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ color: "#7a8fb0", fontSize: 13, padding: "8px 4px" }}>The Faith is considering…</div>
              )}
              <div ref={debateEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}