import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyDNgGC-3qksHbOWsKcEh50_5ZE6wH3n8aQ",
  authDomain: "dnd-tools-1dd87.firebaseapp.com",
  projectId: "dnd-tools-1dd87",
  storageBucket: "dnd-tools-1dd87.firebasestorage.app",
  messagingSenderId: "866582352851",
  appId: "1:866582352851:web:269ec8b40fc5764425d526"
});
const db = getFirestore(app);
const storage = {
  async get(key) {
    const snap = await getDoc(doc(db, "kv", key));
    if (!snap.exists()) throw new Error("not found");
    return { value: snap.data().value };
  },
  async set(key, value) {
    await setDoc(doc(db, "kv", key), { value });
    return { key, value };
  }
};

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
function formatDate(ts) { return new Date(ts).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }); }

// ── Rich Text Editor ─────────────────────────────────────────
function RichEditor({ value, onChange, placeholder, rows = 5 }) {
  const ref = useRef(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value && !isInternalChange.current) {
      ref.current.innerHTML = value || "";
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = () => {
    isInternalChange.current = true;
    onChange(ref.current.innerHTML);
  };

  const exec = (cmd, val = null) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    onChange(ref.current.innerHTML);
  };

  const tools = [
    { label: "B", title: "Fett", cmd: "bold", style: { fontWeight: 700 } },
    { label: "I", title: "Kursiv", cmd: "italic", style: { fontStyle: "italic" } },
    { label: "U", title: "Unterstrichen", cmd: "underline", style: { textDecoration: "underline" } },
    { label: "•", title: "Aufzählung", cmd: "insertUnorderedList", style: {} },
    { label: "—", title: "Trennlinie", cmd: null, action: () => exec("insertHTML", "<hr style='border:none;border-top:1px solid #2a4a38;margin:0.5rem 0;'>"), style: {} },
  ];

  return (
    <div className="rich-editor-wrap">
      <div className="rich-toolbar">
        {tools.map(t => (
          <button key={t.label} title={t.title} className="rich-tool-btn"
            onMouseDown={e => { e.preventDefault(); t.action ? t.action() : exec(t.cmd); }}
            style={t.style}>{t.label}</button>
        ))}
      </div>
      <div
        ref={ref}
        className="rich-content"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        style={{ minHeight: `${rows * 1.6}rem` }}
      />
    </div>
  );
}

const REACTIONS = ["✨", "💀", "😂", "❤️", "🎲", "😱"];
const DEFAULT_PIN = "1234";
const QUEST_STATUSES = [
  { id: "offen",       label: "Offen",       color: "#7ec8a0" },
  { id: "aktiv",       label: "Aktiv",       color: "#a0d8c0" },
  { id: "gelöst",      label: "Gelöst",      color: "#60b888" },
  { id: "gescheitert", label: "Gescheitert", color: "#c87e7e" },
];
const NPC_STATUSES = [
  { id: "lebendig", label: "Lebendig", color: "#7ec8a0" },
  { id: "tot",      label: "Tot",      color: "#c87e7e" },
  { id: "vermisst", label: "Vermisst", color: "#c8b87e" },
  { id: "unbekannt",label: "Unbekannt",color: "#7a9a88" },
];

function qColor(id) { return QUEST_STATUSES.find(s => s.id === id)?.color || "#7a9a88"; }
function npcColor(id) { return NPC_STATUSES.find(s => s.id === id)?.color || "#7a9a88"; }

export default function WitchlightHoardChronik() {
  const [tab, setTab] = useState("chronik");
  const [gmMode, setGmMode] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [playerName, setPlayerName] = useState(() => { try { return localStorage.getItem("wth-player-name") || ""; } catch { return ""; } });
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [recaps, setRecaps] = useState([]);
  const [playerNotes, setPlayerNotes] = useState([]);
  const [quests, setQuests] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [snippets, setSnippets] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [reactions, setReactions] = useState({});
  const [fundstucke, setFundstucke] = useState([]);

  const [expanded, setExpanded] = useState({});
  const [expandedNpc, setExpandedNpc] = useState(null);

  // ── GM forms ──
  const [recapForm, setRecapForm] = useState({ date: "", title: "", text: "" });
  const [editingRecap, setEditingRecap] = useState(null);
  const [snippetForm, setSnippetForm] = useState({ title: "", text: "" });
  const [npcForm, setNpcForm] = useState({ name: "", faction: "", description: "", imageUrl: "", status: "lebendig", notes: "" });
  const [questForm, setQuestForm] = useState({ title: "", description: "", status: "offen" });
  const [editingNpc, setEditingNpc] = useState(null);
  const [editingQuest, setEditingQuest] = useState(null);
  const [showRecapForm, setShowRecapForm] = useState(false);
  const [showSnippetForm, setShowSnippetForm] = useState(false);
  const [showNpcForm, setShowNpcForm] = useState(false);
  const [showQuestForm, setShowQuestForm] = useState(false);

  // ── Player forms ──
  const [noteForm, setNoteForm] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [quoteForm, setQuoteForm] = useState({ speaker: "", text: "" });
  const [playerQuestForm, setPlayerQuestForm] = useState({ title: "", description: "" });
  const [npcImpression, setNpcImpression] = useState({ npcId: null, text: "" });

  // ── Fundstücke ──
  const [fundForm, setFundForm] = useState({ type: "brief", title: "", text: "", imageUrl: "" });
  const [showFundForm, setShowFundForm] = useState(false);
  const [expandedFund, setExpandedFund] = useState(null);

  const FUND_TYPES = [
    { id: "brief",    label: "Brief",     icon: "✉" },
    { id: "tagebuch", label: "Tagebuch",  icon: "📔" },
    { id: "notiz",    label: "Notiz",     icon: "📝" },
    { id: "artefakt", label: "Artefakt",  icon: "🏺" },
    { id: "karte",    label: "Karte",     icon: "🗺" },
    { id: "sonstiges",label: "Sonstiges", icon: "🔮" },
  ];

  // ── Load all shared data — wth- keys, never touches Witchlight M ──
  useEffect(() => {
    (async () => {
      const pairs = [
        ["wth-s-recaps",      setRecaps,      []],
        ["wth-s-playernotes", setPlayerNotes, []],
        ["wth-s-quests",      setQuests,      []],
        ["wth-s-quotes",      setQuotes,      []],
        ["wth-s-snippets",    setSnippets,    []],
        ["wth-s-npcs",        setNpcs,        []],
        ["wth-s-reactions",   setReactions,   {}],
        ["wth-s-fundstucke",  setFundstucke,  []],
      ];
      for (const [key, setter, def] of pairs) {
        try { const r = await storage.get(key); setter(JSON.parse(r.value)); }
        catch { setter(def); }
      }
      setLoaded(true);
    })();
  }, []);

  const ss  = async (key, val) => { try { await storage.set(key, JSON.stringify(val)); } catch {} };
  const ur  = (u) => { setRecaps(u);      ss("wth-s-recaps",      u); };
  const upn = (u) => { setPlayerNotes(u); ss("wth-s-playernotes", u); };
  const uq  = (u) => { setQuests(u);      ss("wth-s-quests",      u); };
  const uqt = (u) => { setQuotes(u);      ss("wth-s-quotes",      u); };
  const usn = (u) => { setSnippets(u);    ss("wth-s-snippets",    u); };
  const un  = (u) => { setNpcs(u);        ss("wth-s-npcs",        u); };
  const ureact = (u) => { setReactions(u); ss("wth-s-reactions",  u); };
  const uf  = (u) => { setFundstucke(u);  ss("wth-s-fundstucke",  u); };

  const pin = () => { try { return localStorage.getItem("wth-gm-pin") || DEFAULT_PIN; } catch { return DEFAULT_PIN; } };

  const tryPin = () => {
    if (pinInput === pin()) { setGmMode(true); setShowPin(false); setPinInput(""); setPinError(false); }
    else { setPinError(true); }
  };

  const saveName = () => {
    if (!nameInput.trim()) return;
    setPlayerName(nameInput.trim());
    try { localStorage.setItem("wth-player-name", nameInput.trim()); } catch {}
    setShowNamePrompt(false); setNameInput("");
  };

  const react = (recapId, emoji) => {
    const u = { ...reactions, [recapId]: { ...(reactions[recapId] || {}) } };
    u[recapId][emoji] = (u[recapId][emoji] || 0) + 1;
    ureact(u);
  };

  // ── Actions ──
  const addRecap = () => {
    if (!recapForm.title.trim() || !recapForm.text.trim()) return;
    if (editingRecap) {
      ur(recaps.map(r => r.id === editingRecap
        ? { ...r, date: recapForm.date || r.date, title: recapForm.title.trim(), text: recapForm.text }
        : r));
      setEditingRecap(null);
    } else {
      ur([{ id: makeId(), date: recapForm.date || new Date().toISOString().slice(0,10), title: recapForm.title.trim(), text: recapForm.text, ts: Date.now() }, ...recaps]);
    }
    setRecapForm({ date: "", title: "", text: "" }); setShowRecapForm(false);
  };

  const startEditRecap = (r) => {
    setRecapForm({ date: r.date || "", title: r.title, text: r.text });
    setEditingRecap(r.id);
    setShowRecapForm(true);
    setExpanded(e => ({ ...e, [r.id]: false }));
  };

  const addSnippet = () => {
    if (!snippetForm.text.trim()) return;
    usn([{ id: makeId(), title: snippetForm.title.trim(), text: snippetForm.text.trim(), ts: Date.now() }, ...snippets]);
    setSnippetForm({ title: "", text: "" }); setShowSnippetForm(false);
  };

  const saveNpc = () => {
    if (!npcForm.name.trim()) return;
    if (editingNpc) { un(npcs.map(n => n.id === editingNpc ? { ...n, ...npcForm } : n)); }
    else { un([{ id: makeId(), ...npcForm, impressions: [] }, ...npcs]); }
    setNpcForm({ name: "", faction: "", description: "", imageUrl: "", status: "lebendig", notes: "" });
    setEditingNpc(null); setShowNpcForm(false);
  };

  const addImpression = (npcId) => {
    if (!npcImpression.text.trim() || !playerName) return;
    un(npcs.map(n => n.id === npcId ? { ...n, impressions: [...(n.impressions || []), { id: makeId(), text: npcImpression.text.trim(), author: playerName, ts: Date.now() }] } : n));
    setNpcImpression({ npcId: null, text: "" });
  };

  const saveQuest = () => {
    if (!questForm.title.trim()) return;
    if (editingQuest) { uq(quests.map(q => q.id === editingQuest ? { ...q, ...questForm } : q)); }
    else { uq([{ id: makeId(), ...questForm, ts: Date.now(), addedBy: "GM" }, ...quests]); }
    setQuestForm({ title: "", description: "", status: "offen" });
    setEditingQuest(null); setShowQuestForm(false);
  };

  const suggestQuest = () => {
    if (!playerQuestForm.title.trim() || !playerName) return;
    uq([...quests, { id: makeId(), title: playerQuestForm.title.trim(), description: playerQuestForm.description.trim(), status: "offen", ts: Date.now(), addedBy: playerName, suggested: true }]);
    setPlayerQuestForm({ title: "", description: "" });
  };

  const addNote = () => {
    if (!noteForm.trim() || !playerName) return;
    if (editingNote) {
      upn(playerNotes.map(n => n.id === editingNote ? { ...n, text: noteForm } : n));
      setEditingNote(null);
    } else {
      upn([{ id: makeId(), text: noteForm, author: playerName, ts: Date.now() }, ...playerNotes]);
    }
    setNoteForm("");
  };

  const startEditNote = (n) => { setNoteForm(n.text); setEditingNote(n.id); };

  const addQuote = () => {
    if (!quoteForm.text.trim()) return;
    uqt([{ id: makeId(), speaker: quoteForm.speaker.trim() || (playerName || "Unbekannt"), text: quoteForm.text.trim(), ts: Date.now() }, ...quotes]);
    setQuoteForm({ speaker: "", text: "" });
  };

  const addFund = () => {
    if (!fundForm.title.trim()) return;
    uf([{ id: makeId(), ...fundForm, ts: Date.now() }, ...fundstucke]);
    setFundForm({ type: "brief", title: "", text: "", imageUrl: "" });
    setShowFundForm(false);
  };

  const needName = () => { setShowNamePrompt(true); setNameInput(playerName); };

  const tabs = [
    { id: "chronik",     icon: "📖", label: "Chronik" },
    { id: "spieler",     icon: "✦",  label: "Spieler" },
    { id: "quests",      icon: "📜",  label: "Quests" },
    { id: "zitate",      icon: "❝",  label: "Zitate" },
    { id: "geschichten", icon: "🌙",  label: "Geschichten" },
    { id: "npcs",        icon: "👥",  label: "NPCs" },
    { id: "fundstucke",  icon: "🔍",  label: "Fundstücke" },
  ];

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: "#080f0c", display: "flex", alignItems: "center", justifyContent: "center", color: "#7ec8a0", fontFamily: "serif", fontSize: "1.1rem", letterSpacing: "0.15em" }}>
      🌙 lädt...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080f0c", color: "#b8ccc0", fontFamily: "'Crimson Pro', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #080f0c; }
        ::-webkit-scrollbar-thumb { background: #1a3028; border-radius: 2px; }

        /* ── Header ── */
        .hdr {
          background: #060d09;
          border-bottom: 1px solid #1a3028;
          padding: 1rem 1.2rem 0;
          position: sticky; top: 0; z-index: 30;
        }
        .hdr-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.7rem; }
        .campaign-name {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1rem, 4vw, 1.5rem);
          font-weight: 700; font-style: italic;
          color: #7ec8a0; margin: 0; letter-spacing: 0.02em;
          text-shadow: 0 0 30px rgba(126,200,160,0.3), 0 0 60px rgba(126,200,160,0.1);
          animation: forestGlow 4s ease-in-out infinite;
        }
        @keyframes forestGlow {
          0%,100% { text-shadow: 0 0 20px rgba(126,200,160,0.2); }
          50% { text-shadow: 0 0 40px rgba(126,200,160,0.45); }
        }
        .campaign-sub {
          font-family: 'Crimson Pro', serif; font-style: italic;
          font-size: 0.78rem; color: #2a4a38; margin: 0.1rem 0 0;
        }
        .hdr-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; }
        .gm-badge {
          font-family: 'Cinzel', serif; font-size: 0.45rem; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          padding: 0.2rem 0.5rem; border-radius: 2px;
        }
        .gm-badge.active { background: #0e2a1e; color: #7ec8a0; border: 1px solid #3a7a58; }
        .gm-badge.inactive { background: #0a1510; color: #2a4a38; border: 1px solid #1a3028; cursor: pointer; transition: all 0.15s; }
        .gm-badge.inactive:hover { background: #0e2a1e; color: #5aaa78; }
        .player-chip {
          font-family: 'Cinzel', serif; font-size: 0.42rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #2a5a3a; cursor: pointer;
        }
        .player-chip:hover { color: #5a9a70; }

        /* ── Tabs ── */
        .tab-row {
          display: flex; gap: 0; overflow-x: auto; scrollbar-width: none;
          border-top: 1px solid rgba(126,200,160,0.08);
        }
        .tab-row::-webkit-scrollbar { display: none; }
        .tab-btn {
          font-family: 'Cinzel', serif; font-size: 0.46rem; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 0.55rem 0.8rem; background: none; border: none;
          cursor: pointer; color: #2a4a38; white-space: nowrap;
          transition: all 0.15s; border-bottom: 2px solid transparent;
          display: flex; align-items: center; gap: 0.3rem;
        }
        .tab-btn.active { color: #7ec8a0; border-bottom-color: #5aaa78; }
        .tab-btn:hover:not(.active) { color: #4a7a58; }
        .tab-icon { font-size: 0.8rem; }

        /* ── Page ── */
        .page { padding: 1.2rem; max-width: 680px; margin: 0 auto; }

        /* ── Cards ── */
        .card {
          background: #0a1510; border: 1px solid #152518;
          border-radius: 4px; padding: 1rem 1.2rem; margin-bottom: 0.7rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3); animation: fadeIn 0.2s ease;
          position: relative; overflow: hidden;
        }
        .card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(126,200,160,0.2), transparent);
        }
        .card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
        .card-header { display: flex; align-items: flex-start; gap: 0.7rem; cursor: pointer; }
        .card-date-lbl {
          font-family: 'Cinzel', serif; font-size: 0.42rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; color: #2a5a38;
          min-width: auto; flex-shrink: 0; line-height: 1.4; padding-top: 0.1rem;
        }
        .card-info { flex: 1; }
        .card-title {
          font-family: 'Playfair Display', serif; font-size: 1rem;
          font-weight: 700; color: #c8dcd2; margin: 0 0 0.15rem; line-height: 1.3;
        }
        .card-meta {
          font-family: 'Cinzel', serif; font-size: 0.42rem;
          letter-spacing: 0.12em; text-transform: uppercase; color: #2a4a38;
        }
        .card-chevron { color: #1a3028; font-size: 0.7rem; flex-shrink: 0; margin-top: 0.3rem; transition: transform 0.2s; }
        .card-chevron.open { transform: rotate(180deg); }
        .card-body { margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px solid #0e2018; }
        .narrative {
          font-family: 'Crimson Pro', serif; font-size: 0.95rem;
          line-height: 1.85; color: #8aaa95; font-style: italic;
          white-space: pre-wrap;
        }

        /* ── Reactions ── */
        .reactions-row { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.8rem; align-items: center; }
        .react-btn {
          background: rgba(126,200,160,0.06); border: 1px solid #1a3028;
          border-radius: 20px; padding: 0.2rem 0.5rem; cursor: pointer;
          font-size: 0.85rem; display: flex; align-items: center; gap: 0.2rem;
          transition: all 0.15s;
        }
        .react-btn:hover { background: rgba(126,200,160,0.12); border-color: #3a7a58; transform: scale(1.05); }
        .react-count { font-family: 'Cinzel', serif; font-size: 0.5rem; color: #5aaa78; }
        .react-add-row {
          display: flex; gap: 0.3rem; flex-wrap: wrap; margin-top: 0.5rem;
          padding-top: 0.5rem; border-top: 1px dashed #1a3028;
        }
        .add-react-btn {
          font-size: 1rem; background: none; border: 1px dashed #1a3028;
          border-radius: 20px; padding: 0.15rem 0.4rem;
          cursor: pointer; transition: all 0.15s; opacity: 0.5;
        }
        .add-react-btn:hover { opacity: 1; background: rgba(126,200,160,0.06); transform: scale(1.1); }

        /* ── NPC grid ── */
        .npc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.8rem; }
        .npc-card {
          background: #0a1510; border: 1px solid #152518;
          border-radius: 4px; overflow: hidden; cursor: pointer;
          transition: all 0.15s; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .npc-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.4), 0 0 15px rgba(126,200,160,0.08); }
        .npc-img {
          width: 100%; aspect-ratio: 1; object-fit: cover;
          background: linear-gradient(135deg, #0e2018, #0a1a12);
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; color: #2a4a38;
        }
        .npc-img img { width: 100%; height: 100%; object-fit: cover; }
        .npc-card-body { padding: 0.6rem 0.7rem; }
        .npc-card-name {
          font-family: 'Cinzel', serif; font-size: 0.62rem; font-weight: 700;
          letter-spacing: 0.08em; color: #c8dcd2; margin: 0 0 0.15rem;
        }
        .npc-card-faction {
          font-family: 'Crimson Pro', serif; font-style: italic;
          font-size: 0.72rem; color: #4a7a58; margin: 0;
        }
        .npc-status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 0.3rem; }

        /* ── NPC detail ── */
        .npc-detail {
          background: #0a1510; border: 1px solid #1a3028;
          border-radius: 4px; padding: 1.2rem; margin-bottom: 0.8rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        }
        .npc-detail-img {
          width: 100%; max-height: 200px; object-fit: cover;
          border-radius: 2px; margin-bottom: 0.8rem;
          background: linear-gradient(135deg, #0e2018, #0a1a12);
          display: flex; align-items: center; justify-content: center;
          font-size: 3rem; color: #2a4a38; min-height: 80px;
        }
        .npc-detail-name {
          font-family: 'Playfair Display', serif; font-size: 1.1rem;
          font-weight: 700; color: #c8dcd2; margin: 0 0 0.2rem;
        }
        .npc-detail-faction {
          font-family: 'Crimson Pro', serif; font-style: italic;
          font-size: 0.85rem; color: #4a7a58; margin: 0 0 0.5rem;
        }
        .npc-desc { font-size: 0.9rem; color: #7a9a85; line-height: 1.7; margin-bottom: 0.8rem; }
        .impression-list { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.5rem; }
        .impression {
          background: rgba(126,200,160,0.04); border: 1px solid #1a3028;
          border-radius: 2px; padding: 0.5rem 0.7rem;
          font-style: italic; font-size: 0.85rem; color: #6a9a78;
        }
        .impression-author {
          font-family: 'Cinzel', serif; font-size: 0.42rem;
          letter-spacing: 0.1em; text-transform: uppercase; color: #2a4a38; margin-top: 0.2rem;
        }

        /* ── Quest list ── */
        .quest-card {
          background: #0a1510; border: 1px solid #152518;
          border-radius: 2px; padding: 0.8rem 1rem; margin-bottom: 0.5rem;
          display: flex; align-items: flex-start; gap: 0.7rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }
        .quest-status {
          font-family: 'Cinzel', serif; font-size: 0.4rem; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 1px;
          border: 1px solid var(--qc); color: var(--qc); flex-shrink: 0; margin-top: 0.15rem; white-space: nowrap;
        }
        .quest-title {
          font-family: 'Cinzel', serif; font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.06em; color: #c8dcd2; margin: 0 0 0.2rem;
        }
        .quest-desc { font-size: 0.85rem; color: #5a8a68; line-height: 1.5; margin: 0; }
        .quest-by {
          font-family: 'Cinzel', serif; font-size: 0.4rem; letter-spacing: 0.1em;
          text-transform: uppercase; color: #2a4a38; margin-top: 0.3rem;
        }
        .suggested-badge {
          font-family: 'Cinzel', serif; font-size: 0.38rem; letter-spacing: 0.1em;
          text-transform: uppercase; color: #3a6a4a; background: #0e1e16;
          border: 1px dashed #2a4a38; padding: 0.1rem 0.35rem; border-radius: 1px; margin-left: 0.4rem;
        }

        /* ── Quote wall ── */
        .quotes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.8rem; }
        .quote-card {
          background: #0a1510; border: 1px solid #152518;
          border-radius: 2px; padding: 1rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .quote-mark {
          font-family: 'Playfair Display', serif; font-size: 2.5rem;
          color: #1a3028; line-height: 0.5; display: block; margin-bottom: 0.4rem;
        }
        .quote-text {
          font-family: 'Crimson Pro', serif; font-style: italic;
          font-size: 0.95rem; color: #8aaa95; line-height: 1.65; margin: 0 0 0.5rem;
        }
        .quote-speaker {
          font-family: 'Cinzel', serif; font-size: 0.45rem;
          letter-spacing: 0.12em; text-transform: uppercase; color: #2a4a38;
        }
        .quote-del {
          float: right; background: none; border: none; color: #1a3028;
          cursor: pointer; font-size: 0.75rem; transition: color 0.15s;
          padding: 0; line-height: 1;
        }
        .quote-del:hover { color: #c87e7e; }

        /* ── Snippet cards ── */
        .snippet-card {
          background: #0a1510; border: 1px solid #152518;
          border-radius: 2px; padding: 1.2rem 1.4rem; margin-bottom: 0.8rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }
        .snippet-title {
          font-family: 'Playfair Display', serif; font-size: 0.95rem;
          font-weight: 700; font-style: italic; color: #a0c8b0; margin: 0 0 0.6rem;
        }
        .snippet-text {
          font-family: 'Crimson Pro', serif; font-style: italic;
          font-size: 0.92rem; line-height: 1.9; color: #7a9a85; white-space: pre-wrap;
        }
        .snippet-meta {
          font-family: 'Cinzel', serif; font-size: 0.42rem; letter-spacing: 0.12em;
          text-transform: uppercase; color: #1a3028; margin-top: 0.7rem;
        }

        /* ── Player note cards ── */
        .pnote-card {
          background: #0a1510; border: 1px solid #152518;
          border-left: 2px solid #4a9a70;
          border-radius: 0 2px 2px 0; padding: 0.8rem 1rem; margin-bottom: 0.5rem;
        }
        .pnote-author {
          font-family: 'Cinzel', serif; font-size: 0.48rem; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase; color: #5aaa78; margin: 0 0 0.3rem;
        }
        .pnote-text { font-size: 0.92rem; color: #7a9a85; line-height: 1.6; margin: 0; }
        .pnote-date {
          font-family: 'Cinzel', serif; font-size: 0.4rem;
          letter-spacing: 0.1em; color: #1a3028; margin-top: 0.25rem;
        }

        /* ── Forms ── */
        .form-panel {
          background: #0a1510; border: 1px solid #1a3028;
          border-radius: 2px; padding: 1rem 1.2rem; margin-bottom: 1rem;
        }
        .form-title {
          font-family: 'Cinzel', serif; font-size: 0.58rem; font-weight: 700;
          letter-spacing: 0.2em; text-transform: uppercase; color: #5aaa78; margin: 0 0 0.8rem;
        }
        .f-group { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.6rem; }
        .f-label {
          font-family: 'Cinzel', serif; font-size: 0.48rem; font-weight: 600;
          letter-spacing: 0.15em; text-transform: uppercase; color: #3a6a4a;
        }
        .f-input {
          background: #080f0c; border: 1px solid #1a3028; color: #c8dcd2;
          font-family: 'Crimson Pro', serif; font-size: 0.95rem;
          padding: 0.5rem 0.7rem; outline: none; border-radius: 1px; width: 100%;
          transition: border-color 0.15s;
        }
        .f-input:focus { border-color: #4a9a70; }
        .f-input::placeholder { color: #1a3028; }
        .f-select {
          background: #080f0c; border: 1px solid #1a3028; color: #7a9a85;
          font-family: 'Cinzel', serif; font-size: 0.58rem;
          padding: 0.5rem 0.7rem; outline: none; border-radius: 1px; width: 100%; cursor: pointer;
        }
        .f-row { display: grid; grid-template-columns: 1fr 2fr; gap: 0.6rem; }
        .f-actions { display: flex; gap: 0.5rem; margin-top: 0.6rem; }

        /* ── Buttons ── */
        .btn-primary {
          font-family: 'Cinzel', serif; font-size: 0.55rem; font-weight: 700;
          letter-spacing: 0.2em; text-transform: uppercase; color: #080f0c;
          background: linear-gradient(135deg, #4a9a70, #7ec8a0);
          border: none; padding: 0.5rem 1.2rem; cursor: pointer; border-radius: 1px;
          transition: all 0.15s; box-shadow: 0 2px 12px rgba(126,200,160,0.2);
        }
        .btn-primary:hover { filter: brightness(1.1); box-shadow: 0 2px 20px rgba(126,200,160,0.35); transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.3; transform: none; box-shadow: none; }
        .btn-secondary {
          font-family: 'Cinzel', serif; font-size: 0.55rem; letter-spacing: 0.12em;
          text-transform: uppercase; color: #3a6a4a; background: #0a1510;
          border: 1px solid #1a3028; padding: 0.5rem 1rem; cursor: pointer;
          border-radius: 1px; transition: all 0.15s;
        }
        .btn-secondary:hover { background: #0e2018; border-color: #3a6a4a; }
        .btn-add {
          font-family: 'Cinzel', serif; font-size: 0.52rem; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase; color: #4a9a70;
          background: #0a1510; border: 1px dashed #2a5a3a;
          padding: 0.5rem 1rem; cursor: pointer; border-radius: 1px; transition: all 0.15s;
        }
        .btn-add:hover { background: #0e2018; border-style: solid; }
        .btn-danger {
          background: none; border: none; color: #1a3028; cursor: pointer;
          font-size: 0.8rem; transition: color 0.15s; padding: 0.1rem;
        }
        .btn-danger:hover { color: #c87e7e; }
        .section-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
        .section-title {
          font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700;
          letter-spacing: 0.2em; text-transform: uppercase; color: #5aaa78; margin: 0;
        }
        .card-act-edit {
          font-family: 'Cinzel', serif; font-size: 0.52rem; background: #0e2018;
          border: none; color: #3a6a4a; cursor: pointer; padding: 0.2rem 0.5rem;
          border-radius: 1px; transition: all 0.15s; flex-shrink: 0;
        }
        .card-act-edit:hover { background: #1a3a28; color: #5aaa78; }

        /* ── Rich Editor ── */
        .rich-editor-wrap {
          border: 1px solid #1a3028; border-radius: 1px; overflow: hidden;
          background: #080f0c; transition: border-color 0.15s;
        }
        .rich-editor-wrap:focus-within { border-color: #4a9a70; }
        .rich-toolbar {
          display: flex; gap: 0.2rem; padding: 0.4rem 0.5rem;
          background: #0a1510; border-bottom: 1px solid #1a3028; flex-wrap: wrap;
        }
        .rich-tool-btn {
          font-family: 'Cinzel', serif; font-size: 0.7rem; min-width: 1.8rem; height: 1.8rem;
          background: #0e2018; border: 1px solid #1a3028; color: #5aaa78;
          cursor: pointer; border-radius: 2px; transition: all 0.12s;
          display: flex; align-items: center; justify-content: center; padding: 0 0.3rem;
        }
        .rich-tool-btn:hover { background: #1a3a28; border-color: #4a9a70; }
        .rich-tool-btn:active { transform: scale(0.92); }
        .rich-content {
          padding: 0.6rem 0.8rem; font-family: 'Crimson Pro', serif;
          font-size: 0.95rem; color: #b8ccc0; line-height: 1.85; outline: none;
        }
        .rich-content:empty:before { content: attr(data-placeholder); color: #1a3028; font-style: italic; pointer-events: none; }
        .rich-content ul { margin: 0.3rem 0 0.3rem 1.2rem; padding: 0; }
        .rich-content li { margin-bottom: 0.2rem; }
        .rich-content b, .rich-content strong { color: #c8dcd2; }
        .rich-content em, .rich-content i { color: #7ec8a0; }
        .rich-content hr { border: none; border-top: 1px solid #1a3028; margin: 0.5rem 0; }
        .narrative ul { margin: 0.3rem 0 0.3rem 1.2rem; padding: 0; }
        .narrative li { margin-bottom: 0.2rem; }
        .narrative b, .narrative strong { color: #c8dcd2; }
        .narrative em, .narrative i { color: #7ec8a0; }

        /* ── Overlay / PIN ── */
        .overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 50;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
        }
        .pin-box {
          background: #0a1510; border: 1px solid #2a5a38;
          border-radius: 2px; padding: 2rem; width: 280px; text-align: center;
          box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 40px rgba(126,200,160,0.08);
        }
        .pin-title {
          font-family: 'Playfair Display', serif; font-size: 1.1rem;
          font-weight: 700; font-style: italic; color: #7ec8a0; margin: 0 0 0.4rem;
        }
        .pin-sub {
          font-family: 'Crimson Pro', serif; font-style: italic;
          font-size: 0.82rem; color: #2a5a38; margin: 0 0 1rem;
        }
        .pin-input {
          background: #080f0c; border: 1px solid #1a3028; border-radius: 1px;
          color: #c8dcd2; font-family: 'Cinzel', serif; font-size: 1.5rem;
          font-weight: 700; letter-spacing: 0.3em; text-align: center;
          padding: 0.7rem; outline: none; width: 100%; margin-bottom: 0.8rem;
          transition: border-color 0.15s;
        }
        .pin-input:focus { border-color: #4a9a70; }
        .pin-input.error { border-color: #c87e7e; }
        .pin-error {
          font-family: 'Crimson Pro', serif; font-style: italic;
          font-size: 0.8rem; color: #c87e7e; margin: 0 0 0.6rem;
        }
        .pin-actions { display: flex; gap: 0.5rem; justify-content: center; }
        .name-box {
          background: #0a1510; border: 1px solid #2a5a38;
          border-radius: 2px; padding: 1.5rem; width: 300px; text-align: center;
          box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        }
        .name-title {
          font-family: 'Playfair Display', serif; font-size: 1rem;
          font-weight: 700; font-style: italic; color: #7ec8a0; margin: 0 0 0.3rem;
        }
        .name-sub {
          font-family: 'Crimson Pro', serif; font-style: italic;
          font-size: 0.82rem; color: #2a5a38; margin: 0 0 1rem;
        }

        /* ── Fundstücke ── */
        .fund-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.8rem; }
        .fund-card {
          background: #0a1510; border: 1px solid #152518;
          border-radius: 2px; overflow: hidden; cursor: pointer;
          transition: all 0.15s; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .fund-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.4), 0 0 15px rgba(126,200,160,0.06); }
        .fund-card-top { padding: 0.9rem 0.9rem 0.4rem; display: flex; align-items: flex-start; gap: 0.5rem; }
        .fund-icon { font-size: 1.4rem; flex-shrink: 0; line-height: 1; }
        .fund-card-name {
          font-family: 'Cinzel', serif; font-size: 0.62rem; font-weight: 700;
          letter-spacing: 0.06em; color: #c8dcd2; line-height: 1.3;
        }
        .fund-type-label {
          font-family: 'Cinzel', serif; font-size: 0.4rem; letter-spacing: 0.1em;
          text-transform: uppercase; color: #2a4a38; padding: 0 0.9rem 0.5rem; display: block;
        }
        .fund-preview {
          font-family: 'Crimson Pro', serif; font-style: italic;
          font-size: 0.78rem; color: #3a6a4a; padding: 0 0.9rem 0.8rem;
          line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .fund-detail {
          background: #0a1510; border: 1px solid #1a3028;
          border-radius: 2px; padding: 1.2rem 1.4rem; margin-bottom: 0.8rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4); animation: fadeIn 0.2s ease;
        }
        .fund-detail-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.8rem; gap: 0.5rem; }
        .fund-detail-title {
          font-family: 'Playfair Display', serif; font-size: 1.1rem;
          font-weight: 700; font-style: italic; color: #c8dcd2; margin: 0;
        }
        .fund-detail-meta {
          font-family: 'Cinzel', serif; font-size: 0.42rem;
          letter-spacing: 0.12em; text-transform: uppercase; color: #2a4a38; margin-top: 0.2rem;
        }
        .fund-detail-img {
          width: 100%; max-height: 220px; object-fit: contain;
          border-radius: 1px; margin-bottom: 0.8rem; background: #0e2018; display: block;
        }
        .fund-detail-text {
          font-family: 'Crimson Pro', serif; font-style: italic;
          font-size: 0.95rem; line-height: 1.9; color: #8aaa95; white-space: pre-wrap;
        }
        .fund-type-picker { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
        .fund-type-opt {
          font-family: 'Cinzel', serif; font-size: 0.46rem; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 0.3rem 0.6rem;
          border: 1px solid #1a3028; border-radius: 1px; cursor: pointer;
          color: #2a5a38; background: #0a1510; transition: all 0.12s;
          display: flex; align-items: center; gap: 0.3rem;
        }
        .fund-type-opt.selected { border-color: #4a9a70; color: #7ec8a0; background: #0e2018; }

        /* ── Misc ── */
        .empty {
          text-align: center; padding: 3rem 1.5rem;
          font-family: 'Crimson Pro', serif; font-style: italic;
          color: #1a3028; font-size: 1rem; line-height: 1.8;
        }
        .divider { border: none; border-top: 1px solid #0e2018; margin: 0.8rem 0; }
        .tag {
          font-family: 'Cinzel', serif; font-size: 0.4rem; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 0.15rem 0.4rem;
          border-radius: 1px; border: 1px solid; display: inline-block;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* PIN overlay */}
      {showPin && (
        <div className="overlay" onClick={() => { setShowPin(false); setPinInput(""); setPinError(false); }}>
          <div className="pin-box" onClick={e => e.stopPropagation()}>
            <p className="pin-title">🌙 GM Modus</p>
            <p className="pin-sub">Bitte gib deine PIN ein</p>
            <input className={`pin-input ${pinError ? "error" : ""}`} type="password" maxLength={8}
              value={pinInput} onChange={e => { setPinInput(e.target.value); setPinError(false); }}
              onKeyDown={e => e.key === "Enter" && tryPin()} autoFocus placeholder="••••" />
            {pinError && <p className="pin-error">Falsche PIN. Versuch's nochmal ✦</p>}
            <div className="pin-actions">
              <button className="btn-primary" onClick={tryPin}>Einloggen</button>
              <button className="btn-secondary" onClick={() => { setShowPin(false); setPinInput(""); setPinError(false); }}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* Name prompt */}
      {showNamePrompt && (
        <div className="overlay" onClick={() => setShowNamePrompt(false)}>
          <div className="name-box" onClick={e => e.stopPropagation()}>
            <p className="name-title">Wer bist du?</p>
            <p className="name-sub">Gib deinen Charakternamen ein</p>
            <input className="f-input" style={{ marginBottom: "0.8rem", textAlign: "center" }}
              value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveName()} placeholder="z.B. Eya" autoFocus />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <button className="btn-primary" onClick={saveName}>Speichern</button>
              <button className="btn-secondary" onClick={() => setShowNamePrompt(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="hdr">
        <div className="hdr-top">
          <div>
            <p className="campaign-name">Witchlight Hoard</p>
            <p className="campaign-sub">Kampagnen-Chronik ✦ Gemeinsame Erinnerungen</p>
          </div>
          <div className="hdr-right">
            {gmMode
              ? <span className="gm-badge active" onClick={() => setGmMode(false)}>✦ GM Modus aktiv</span>
              : <span className="gm-badge inactive" onClick={() => setShowPin(true)}>SL einloggen</span>
            }
            <span className="player-chip" onClick={needName}>
              {playerName ? `✦ ${playerName}` : "Namen eingeben"}
            </span>
          </div>
        </div>
        <div className="tab-row">
          {tabs.map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              <span className="tab-icon">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════ CHRONIK ══════════════════ */}
      {tab === "chronik" && (
        <div className="page">
          <div className="section-hdr">
            <p className="section-title">📖 Chronik</p>
            {gmMode && <button className="btn-add" onClick={() => setShowRecapForm(v => !v)}>+ Neue Zusammenfassung</button>}
          </div>
          {gmMode && showRecapForm && (
            <div className="form-panel">
              <p className="form-title">{editingRecap ? "Recap bearbeiten" : "Sitzungszusammenfassung"}</p>
              <div className="f-row">
                <div className="f-group"><label className="f-label">Datum</label>
                  <input className="f-input" type="date" value={recapForm.date} onChange={e => setRecapForm(f => ({...f, date: e.target.value}))} /></div>
                <div className="f-group"><label className="f-label">Titel</label>
                  <input className="f-input" value={recapForm.title} onChange={e => setRecapForm(f => ({...f, title: e.target.value}))} placeholder="Der vergessene Wald" autoFocus /></div>
              </div>
              <div className="f-group"><label className="f-label">Was ist passiert?</label>
                <RichEditor value={recapForm.text} onChange={v => setRecapForm(f => ({...f, text: v}))}
                  placeholder="Schreib hier deinen Recap..." rows={6} /></div>
              <div className="f-actions">
                <button className="btn-primary" onClick={addRecap} disabled={!recapForm.title.trim() || !recapForm.text.trim()}>
                  {editingRecap ? "Änderungen speichern" : "Speichern"}
                </button>
                <button className="btn-secondary" onClick={() => { setShowRecapForm(false); setEditingRecap(null); setRecapForm({ date: "", title: "", text: "" }); }}>Abbrechen</button>
              </div>
            </div>
          )}
          {recaps.length === 0
            ? <div className="empty">Noch keine Sitzungen aufgezeichnet.<br /><span style={{fontSize:"0.85rem"}}>Der erste Eintrag wartet auf sein Abenteuer. 🌙</span></div>
            : recaps.map(r => {
              const isOpen = expanded[r.id];
              const rReacts = reactions[r.id] || {};
              const hasReacts = Object.values(rReacts).some(v => v > 0);
              return (
                <div key={r.id} className="card">
                  <div className="card-header" onClick={() => setExpanded(e => ({...e, [r.id]: !e[r.id]}))}>
                    <span className="card-date-lbl">
                      {r.date ? new Date(r.date + "T12:00:00").toLocaleDateString("de-DE", {day:"numeric",month:"short",year:"numeric"}) : formatDate(r.ts)}
                    </span>
                    <div className="card-info">
                      <p className="card-title">{r.title}</p>
                      <p className="card-meta">{formatDate(r.ts)}</p>
                    </div>
                    {gmMode && <button className="btn-danger" onClick={e => { e.stopPropagation(); if(window.confirm("Löschen?")) ur(recaps.filter(x => x.id !== r.id)); }}>✕</button>}
                    {gmMode && <button className="card-act-edit" onClick={e => { e.stopPropagation(); startEditRecap(r); }}>✎</button>}
                    <span className={`card-chevron ${isOpen ? "open" : ""}`}>▼</span>
                  </div>
                  {isOpen && (
                    <div className="card-body">
                      <div className="narrative" dangerouslySetInnerHTML={{ __html: r.text }} />
                      <div className="divider" />
                      {hasReacts && (
                        <div className="reactions-row">
                          {REACTIONS.map(emoji => rReacts[emoji] > 0 && (
                            <div key={emoji} className="react-btn">
                              <span>{emoji}</span>
                              <span className="react-count">{rReacts[emoji]}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="react-add-row">
                        <span style={{fontFamily:"'Cinzel',serif",fontSize:"0.42rem",letterSpacing:"0.1em",textTransform:"uppercase",color:"#1a3028",alignSelf:"center"}}>Reagieren:</span>
                        {REACTIONS.map(emoji => (
                          <button key={emoji} className="add-react-btn" onClick={() => react(r.id, emoji)}>{emoji}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* ══════════════════ SPIELER ══════════════════ */}
      {tab === "spieler" && (
        <div className="page">
          <div className="section-hdr"><p className="section-title">✦ Spielernotizen</p></div>
          {!playerName
            ? <div className="empty">Gib zuerst deinen Charakternamen ein.<br /><button className="btn-add" style={{marginTop:"0.8rem"}} onClick={needName}>Namen eingeben</button></div>
            : (
              <div className="form-panel">
                <p className="form-title">{editingNote ? "Notiz bearbeiten" : `Deine Notiz — ${playerName}`}</p>
                <div className="f-group">
                  <RichEditor value={noteForm} onChange={setNoteForm}
                    placeholder="Was war dein Highlight der Session?" rows={3} />
                </div>
                <div className="f-actions">
                  <button className="btn-primary" onClick={addNote} disabled={!noteForm.trim()}>{editingNote ? "Speichern" : "Notiz posten"}</button>
                  {editingNote && <button className="btn-secondary" onClick={() => { setEditingNote(null); setNoteForm(""); }}>Abbrechen</button>}
                </div>
              </div>
            )}
          {playerNotes.length === 0
            ? <div className="empty" style={{paddingTop:"1rem"}}>Noch keine Spielernotizen.<br /><span style={{fontSize:"0.85rem"}}>Was habt ihr erlebt? ✦</span></div>
            : playerNotes.map(n => (
              <div key={n.id} className="pnote-card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.25rem"}}>
                  <p className="pnote-author">{n.author}</p>
                  {(n.author === playerName || gmMode) && (
                    <div style={{display:"flex",gap:"0.3rem"}}>
                      {n.author === playerName && <button className="card-act-edit" onClick={() => startEditNote(n)}>✎</button>}
                      <button className="btn-danger" onClick={() => upn(playerNotes.filter(x => x.id !== n.id))}>✕</button>
                    </div>
                  )}
                </div>
                <div className="pnote-text narrative" dangerouslySetInnerHTML={{ __html: n.text }} />
                <p className="pnote-date">{formatDate(n.ts)}</p>
              </div>
            ))}
        </div>
      )}

      {/* ══════════════════ QUESTS ══════════════════ */}
      {tab === "quests" && (
        <div className="page">
          <div className="section-hdr">
            <p className="section-title">📜 Questbuch</p>
            {gmMode && <button className="btn-add" onClick={() => { setShowQuestForm(v => !v); setEditingQuest(null); setQuestForm({title:"",description:"",status:"offen"}); }}>+ Quest hinzufügen</button>}
          </div>
          {gmMode && showQuestForm && (
            <div className="form-panel">
              <p className="form-title">{editingQuest ? "Quest bearbeiten" : "Neue Quest"}</p>
              <div className="f-group"><label className="f-label">Titel</label>
                <input className="f-input" value={questForm.title} onChange={e => setQuestForm(f=>({...f,title:e.target.value}))} placeholder="z.B. Das Geheimnis des Mondblumenwalds" autoFocus /></div>
              <div className="f-group"><label className="f-label">Beschreibung</label>
                <textarea className="f-input" rows={2} value={questForm.description} onChange={e => setQuestForm(f=>({...f,description:e.target.value}))} placeholder="Was wissen die Spieler?" /></div>
              <div className="f-group"><label className="f-label">Status</label>
                <select className="f-select" value={questForm.status} onChange={e => setQuestForm(f=>({...f,status:e.target.value}))}>
                  {QUEST_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="f-actions">
                <button className="btn-primary" onClick={saveQuest} disabled={!questForm.title.trim()}>Speichern</button>
                <button className="btn-secondary" onClick={() => { setShowQuestForm(false); setEditingQuest(null); }}>Abbrechen</button>
              </div>
            </div>
          )}
          {playerName && (
            <div className="form-panel" style={{marginBottom:"1rem"}}>
              <p className="form-title">Quest vorschlagen — {playerName}</p>
              <div className="f-group"><label className="f-label">Idee</label>
                <input className="f-input" value={playerQuestForm.title} onChange={e => setPlayerQuestForm(f=>({...f,title:e.target.value}))} placeholder="z.B. Wir sollten dem Fuchsgeist folgen..." /></div>
              <div className="f-group"><label className="f-label">Warum? (optional)</label>
                <input className="f-input" value={playerQuestForm.description} onChange={e => setPlayerQuestForm(f=>({...f,description:e.target.value}))} placeholder="Kurze Begründung oder Idee" /></div>
              <button className="btn-primary" onClick={suggestQuest} disabled={!playerQuestForm.title.trim() || !playerName}>Vorschlag einreichen</button>
            </div>
          )}
          {quests.length === 0
            ? <div className="empty">Das Questbuch ist noch leer.<br /><span style={{fontSize:"0.85rem"}}>Abenteuer warten... 📜</span></div>
            : QUEST_STATUSES.map(status => {
              const group = quests.filter(q => q.status === status.id);
              if (!group.length) return null;
              return (
                <div key={status.id} style={{marginBottom:"1.2rem"}}>
                  <p style={{fontFamily:"'Cinzel',serif",fontSize:"0.5rem",letterSpacing:"0.15em",textTransform:"uppercase",color:status.color,marginBottom:"0.5rem"}}>{status.label}</p>
                  {group.map(q => (
                    <div key={q.id} className="quest-card">
                      <span className="quest-status tag" style={{"--qc":qColor(q.status),color:qColor(q.status),borderColor:qColor(q.status)}}>{status.label}</span>
                      <div style={{flex:1}}>
                        <p className="quest-title">{q.title}{q.suggested && <span className="suggested-badge">Vorschlag</span>}</p>
                        {q.description && <p className="quest-desc">{q.description}</p>}
                        <p className="quest-by">von {q.addedBy}</p>
                      </div>
                      {gmMode && (
                        <div style={{display:"flex",gap:"0.3rem",flexShrink:0}}>
                          <button className="btn-secondary" style={{padding:"0.2rem 0.5rem",fontSize:"0.45rem"}} onClick={() => { setQuestForm({title:q.title,description:q.description||"",status:q.status}); setEditingQuest(q.id); setShowQuestForm(true); }}>✎</button>
                          <button className="btn-danger" onClick={() => uq(quests.filter(x => x.id !== q.id))}>✕</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
        </div>
      )}

      {/* ══════════════════ ZITATE ══════════════════ */}
      {tab === "zitate" && (
        <div className="page">
          <div className="section-hdr"><p className="section-title">❝ Zitate</p></div>
          <div className="form-panel">
            <p className="form-title">Zitat hinzufügen</p>
            <div className="f-row">
              <div className="f-group"><label className="f-label">Wer?</label>
                <input className="f-input" value={quoteForm.speaker} onChange={e => setQuoteForm(f=>({...f,speaker:e.target.value}))} placeholder={playerName || "Charakter"} /></div>
              <div className="f-group"><label className="f-label">Was wurde gesagt?</label>
                <input className="f-input" value={quoteForm.text} onChange={e => setQuoteForm(f=>({...f,text:e.target.value}))} placeholder="Das unvergessliche Zitat..." /></div>
            </div>
            <button className="btn-primary" onClick={addQuote} disabled={!quoteForm.text.trim()}>Hinzufügen</button>
          </div>
          {quotes.length === 0
            ? <div className="empty">Noch keine Zitate gesammelt.<br /><span style={{fontSize:"0.85rem"}}>Die erste denkwürdige Aussage wartet. ❝</span></div>
            : <div className="quotes-grid">
              {quotes.map(q => (
                <div key={q.id} className="quote-card">
                  {(gmMode || q.speaker === playerName) && <button className="quote-del" onClick={() => uqt(quotes.filter(x => x.id !== q.id))}>✕</button>}
                  <span className="quote-mark">❝</span>
                  <p className="quote-text">{q.text}</p>
                  <p className="quote-speaker">— {q.speaker}</p>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* ══════════════════ GESCHICHTEN ══════════════════ */}
      {tab === "geschichten" && (
        <div className="page">
          <div className="section-hdr">
            <p className="section-title">🌙 Geschichten</p>
            {gmMode && <button className="btn-add" onClick={() => setShowSnippetForm(v => !v)}>+ Snippet hinzufügen</button>}
          </div>
          {gmMode && showSnippetForm && (
            <div className="form-panel">
              <p className="form-title">Neues Story-Snippet</p>
              <div className="f-group"><label className="f-label">Titel (optional)</label>
                <input className="f-input" value={snippetForm.title} onChange={e => setSnippetForm(f=>({...f,title:e.target.value}))} placeholder="z.B. Im Mondlicht" autoFocus /></div>
              <div className="f-group"><label className="f-label">Text</label>
                <textarea className="f-input" rows={7} value={snippetForm.text} onChange={e => setSnippetForm(f=>({...f,text:e.target.value}))} placeholder="Dein Prosa-Snippet, Szene, Gedanke..." /></div>
              <div className="f-actions">
                <button className="btn-primary" onClick={addSnippet} disabled={!snippetForm.text.trim()}>Posten</button>
                <button className="btn-secondary" onClick={() => setShowSnippetForm(false)}>Abbrechen</button>
              </div>
            </div>
          )}
          {snippets.length === 0
            ? <div className="empty">Noch keine Geschichten geschrieben.<br /><span style={{fontSize:"0.85rem"}}>Die Feder wartet... 🌙</span></div>
            : snippets.map(s => (
              <div key={s.id} className="snippet-card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  {s.title && <p className="snippet-title">{s.title}</p>}
                  {gmMode && <button className="btn-danger" onClick={() => usn(snippets.filter(x => x.id !== s.id))}>✕</button>}
                </div>
                <p className="snippet-text">{s.text}</p>
                <p className="snippet-meta">{formatDate(s.ts)}</p>
              </div>
            ))}
        </div>
      )}

      {/* ══════════════════ NPCs ══════════════════ */}
      {tab === "npcs" && (
        <div className="page">
          <div className="section-hdr">
            <p className="section-title">👥 Gesichter</p>
            {gmMode && <button className="btn-add" onClick={() => { setShowNpcForm(v => !v); setEditingNpc(null); setNpcForm({name:"",faction:"",description:"",imageUrl:"",status:"lebendig",notes:""}); }}>+ NPC hinzufügen</button>}
          </div>
          {gmMode && showNpcForm && (
            <div className="form-panel">
              <p className="form-title">{editingNpc ? "NPC bearbeiten" : "Neuer NPC"}</p>
              <div className="f-row">
                <div className="f-group"><label className="f-label">Name</label>
                  <input className="f-input" value={npcForm.name} onChange={e => setNpcForm(f=>({...f,name:e.target.value}))} placeholder="z.B. Zybilna" autoFocus /></div>
                <div className="f-group"><label className="f-label">Fraktion / Rolle</label>
                  <input className="f-input" value={npcForm.faction} onChange={e => setNpcForm(f=>({...f,faction:e.target.value}))} placeholder="z.B. Feenhändlerin" /></div>
              </div>
              <div className="f-group"><label className="f-label">Beschreibung</label>
                <textarea className="f-input" rows={2} value={npcForm.description} onChange={e => setNpcForm(f=>({...f,description:e.target.value}))} placeholder="Was die Spieler über sie/ihn wissen..." /></div>
              <div className="f-group"><label className="f-label">Bild-URL (optional)</label>
                <input className="f-input" value={npcForm.imageUrl} onChange={e => setNpcForm(f=>({...f,imageUrl:e.target.value}))} placeholder="https://i.imgur.com/..." /></div>
              <div className="f-row">
                <div className="f-group"><label className="f-label">Status</label>
                  <select className="f-select" value={npcForm.status} onChange={e => setNpcForm(f=>({...f,status:e.target.value}))}>
                    {NPC_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="f-group"><label className="f-label">GM-Notizen (privat)</label>
                  <input className="f-input" value={npcForm.notes} onChange={e => setNpcForm(f=>({...f,notes:e.target.value}))} placeholder="Was die Spieler nicht wissen..." /></div>
              </div>
              <div className="f-actions">
                <button className="btn-primary" onClick={saveNpc} disabled={!npcForm.name.trim()}>Speichern</button>
                <button className="btn-secondary" onClick={() => { setShowNpcForm(false); setEditingNpc(null); }}>Abbrechen</button>
              </div>
            </div>
          )}

          {expandedNpc && (() => {
            const n = npcs.find(x => x.id === expandedNpc);
            if (!n) return null;
            return (
              <div className="npc-detail">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
                  <div>
                    <p className="npc-detail-name">{n.name}</p>
                    {n.faction && <p className="npc-detail-faction">{n.faction}</p>}
                  </div>
                  <div style={{display:"flex",gap:"0.4rem",alignItems:"center"}}>
                    <span className="tag" style={{color:npcColor(n.status),borderColor:npcColor(n.status)}}>{NPC_STATUSES.find(s=>s.id===n.status)?.label}</span>
                    {gmMode && <button className="btn-secondary" style={{padding:"0.2rem 0.5rem",fontSize:"0.45rem"}} onClick={() => { setNpcForm({name:n.name,faction:n.faction||"",description:n.description||"",imageUrl:n.imageUrl||"",status:n.status,notes:n.notes||""}); setEditingNpc(n.id); setShowNpcForm(true); setExpandedNpc(null); }}>✎ Bearbeiten</button>}
                    <button className="btn-danger" onClick={() => setExpandedNpc(null)}>✕</button>
                  </div>
                </div>
                {n.imageUrl
                  ? <img src={n.imageUrl} alt={n.name} className="npc-detail-img" onError={e => { e.target.style.display="none"; }} />
                  : <div className="npc-detail-img">👤</div>
                }
                {n.description && <p className="npc-desc">{n.description}</p>}
                {gmMode && n.notes && <p style={{fontFamily:"'Cinzel',serif",fontSize:"0.5rem",letterSpacing:"0.1em",textTransform:"uppercase",color:"#2a5a38",marginBottom:"0.3rem",marginTop:"0.5rem"}}>GM-Notiz: <span style={{fontFamily:"'Crimson Pro',serif",fontStyle:"italic",fontSize:"0.8rem",letterSpacing:0,textTransform:"none",color:"#4a7a58"}}>{n.notes}</span></p>}
                <div className="divider" />
                <p style={{fontFamily:"'Cinzel',serif",fontSize:"0.5rem",letterSpacing:"0.15em",textTransform:"uppercase",color:"#2a4a38",marginBottom:"0.5rem"}}>Spieler-Eindrücke</p>
                {(n.impressions||[]).length > 0 && (
                  <div className="impression-list" style={{marginBottom:"0.6rem"}}>
                    {n.impressions.map(imp => (
                      <div key={imp.id} className="impression">
                        "{imp.text}"
                        <p className="impression-author">— {imp.author}</p>
                      </div>
                    ))}
                  </div>
                )}
                {playerName && (
                  <div style={{display:"flex",gap:"0.5rem"}}>
                    <input className="f-input" style={{flex:1}} value={npcImpression.npcId === n.id ? npcImpression.text : ""}
                      onChange={e => setNpcImpression({npcId:n.id,text:e.target.value})}
                      placeholder={`Dein Eindruck von ${n.name}...`} />
                    <button className="btn-primary" style={{whiteSpace:"nowrap"}} onClick={() => addImpression(n.id)}
                      disabled={npcImpression.npcId !== n.id || !npcImpression.text.trim()}>✦ Senden</button>
                  </div>
                )}
              </div>
            );
          })()}

          {npcs.length === 0
            ? <div className="empty">Noch keine NPCs eingetragen.<br /><span style={{fontSize:"0.85rem"}}>Die Welt füllt sich langsam... 👥</span></div>
            : <div className="npc-grid">
              {npcs.map(n => (
                <div key={n.id} className="npc-card" onClick={() => setExpandedNpc(expandedNpc === n.id ? null : n.id)}>
                  <div className="npc-img">
                    {n.imageUrl
                      ? <img src={n.imageUrl} alt={n.name} onError={e => { e.target.style.display="none"; e.target.parentNode.innerHTML="👤"; }} />
                      : "👤"
                    }
                  </div>
                  <div className="npc-card-body">
                    <div style={{display:"flex",alignItems:"center",gap:"0.3rem",marginBottom:"0.1rem"}}>
                      <span className="npc-status-dot" style={{background:npcColor(n.status)}} />
                      <p className="npc-card-name">{n.name}</p>
                    </div>
                    {n.faction && <p className="npc-card-faction">{n.faction}</p>}
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* ══════════════════ FUNDSTÜCKE ══════════════════ */}
      {tab === "fundstucke" && (
        <div className="page">
          <div className="section-hdr">
            <p className="section-title">🔍 Fundstücke</p>
            {gmMode && <button className="btn-add" onClick={() => setShowFundForm(v => !v)}>+ Hinzufügen</button>}
          </div>
          {gmMode && showFundForm && (
            <div className="form-panel">
              <p className="form-title">Neues Fundstück</p>
              <div className="f-group">
                <label className="f-label">Typ</label>
                <div className="fund-type-picker">
                  {FUND_TYPES.map(t => (
                    <span key={t.id} className={`fund-type-opt ${fundForm.type === t.id ? "selected" : ""}`}
                      onClick={() => setFundForm(f => ({...f, type: t.id}))}>
                      {t.icon} {t.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="f-group"><label className="f-label">Titel</label>
                <input className="f-input" value={fundForm.title} onChange={e => setFundForm(f => ({...f, title: e.target.value}))}
                  placeholder="z.B. Brief von Isolde..." autoFocus /></div>
              <div className="f-group"><label className="f-label">Inhalt</label>
                <RichEditor value={fundForm.text} onChange={v => setFundForm(f => ({...f, text: v}))}
                  placeholder="Der Text des Briefes, die Beschreibung des Artefakts..." rows={5} /></div>
              <div className="f-group"><label className="f-label">Bild-URL (optional)</label>
                <input className="f-input" value={fundForm.imageUrl} onChange={e => setFundForm(f => ({...f, imageUrl: e.target.value}))}
                  placeholder="https://i.imgur.com/..." /></div>
              <div className="f-actions">
                <button className="btn-primary" onClick={addFund} disabled={!fundForm.title.trim()}>Speichern</button>
                <button className="btn-secondary" onClick={() => setShowFundForm(false)}>Abbrechen</button>
              </div>
            </div>
          )}

          {expandedFund && (() => {
            const item = fundstucke.find(x => x.id === expandedFund);
            if (!item) return null;
            const ftype = FUND_TYPES.find(t => t.id === item.type);
            return (
              <div className="fund-detail">
                <div className="fund-detail-hdr">
                  <div>
                    <p className="fund-detail-title">{item.title}</p>
                    <p className="fund-detail-meta">{ftype?.icon} {ftype?.label} · {formatDate(item.ts)}</p>
                  </div>
                  <div style={{display:"flex",gap:"0.4rem",flexShrink:0}}>
                    {gmMode && <button className="btn-danger" onClick={() => { uf(fundstucke.filter(x => x.id !== item.id)); setExpandedFund(null); }}>✕ Löschen</button>}
                    <button className="btn-danger" onClick={() => setExpandedFund(null)}>✕</button>
                  </div>
                </div>
                {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="fund-detail-img" onError={e => e.target.style.display="none"} />}
                {item.text && <div className="fund-detail-text narrative" dangerouslySetInnerHTML={{ __html: item.text }} />}
              </div>
            );
          })()}

          {fundstucke.length === 0
            ? <div className="empty">Noch keine Fundstücke.<br /><span style={{fontSize:"0.85rem"}}>Briefe, Tagebücher, Artefakte — alles was sie finden. 🔍</span></div>
            : (
              <div className="fund-grid">
                {fundstucke.map(item => {
                  const ftype = FUND_TYPES.find(t => t.id === item.type);
                  const plainText = item.text?.replace(/<[^>]+>/g, "") || "";
                  return (
                    <div key={item.id} className="fund-card" onClick={() => setExpandedFund(expandedFund === item.id ? null : item.id)}>
                      <div className="fund-card-top">
                        <span className="fund-icon">{ftype?.icon}</span>
                        <span className="fund-card-name">{item.title}</span>
                      </div>
                      <span className="fund-type-label">{ftype?.label}</span>
                      {plainText && <p className="fund-preview">{plainText}</p>}
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}
