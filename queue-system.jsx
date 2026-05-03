import { useState, useEffect, useRef } from "react";

const BUSINESS_TYPES = {
  hospital: { label: "Hospital", icon: "🏥", color: "#0EA5E9", avgTime: 20, services: ["General Checkup", "Emergency", "Lab Test", "Specialist", "Pharmacy"] },
  salon: { label: "Salon", icon: "✂️", color: "#EC4899", avgTime: 30, services: ["Haircut", "Coloring", "Styling", "Manicure", "Facial"] },
  bank: { label: "Bank", icon: "🏦", color: "#F59E0B", avgTime: 12, services: ["Deposit/Withdrawal", "Account Opening", "Loan Inquiry", "Card Services", "Wire Transfer"] },
  restaurant: { label: "Restaurant", icon: "🍽️", color: "#10B981", avgTime: 45, services: ["Dine-in Table", "Takeaway", "Reservation Check-in"] },
  government: { label: "Govt Office", icon: "🏛️", color: "#8B5CF6", avgTime: 25, services: ["License Renewal", "Document Verification", "Permit Application", "ID Services"] },
};

const generateTicket = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return letters[Math.floor(Math.random() * letters.length)] + String(Math.floor(Math.random() * 900) + 100);
};

const formatTime = (mins) => {
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m > 0 ? m + "m" : ""}`;
};

const getETA = (position, avgTime) => {
  const totalMins = position * avgTime;
  const now = new Date();
  now.setMinutes(now.getMinutes() + totalMins);
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const QRCodeSVG = ({ value, size = 120 }) => {
  // Simple visual QR-like pattern for display
  const cells = 15;
  const cell = size / cells;
  const seed = value.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pattern = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      if (r < 4 && c < 4) return 1;
      if (r < 4 && c > cells - 5) return 1;
      if (r > cells - 5 && c < 4) return 1;
      if ((r === 1 || r === 2) && (c === 1 || c === 2)) return 0;
      if ((r === 1 || r === 2) && (c === cells - 3 || c === cells - 2)) return 0;
      if ((r === cells - 3 || r === cells - 2) && (c === 1 || c === 2)) return 0;
      const val = Math.sin(seed * (r + 1) * (c + 1) * 0.37) * 10000;
      return val - Math.floor(val) > 0.45 ? 1 : 0;
    })
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: 8 }}>
      <rect width={size} height={size} fill="white" />
      {pattern.map((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#111" /> : null
        )
      )}
    </svg>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    waiting: { color: "#F59E0B", bg: "#FEF3C7", label: "Waiting" },
    called: { color: "#3B82F6", bg: "#DBEAFE", label: "Called" },
    serving: { color: "#10B981", bg: "#D1FAE5", label: "Serving" },
    done: { color: "#6B7280", bg: "#F3F4F6", label: "Done" },
  };
  const s = map[status] || map.waiting;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
      {s.label}
    </span>
  );
};

export default function App() {
  const [view, setView] = useState("home"); // home | join | ticket | admin | display
  const [businessType, setBusinessType] = useState("hospital");
  const [queue, setQueue] = useState([
    { id: 1, ticket: "A042", name: "Sarah M.", email: "sarah@email.com", phone: "+1 555-0101", service: "General Checkup", status: "serving", joinedAt: new Date(Date.now() - 25 * 60000), position: 0 },
    { id: 2, ticket: "B103", name: "James R.", email: "james@email.com", phone: "+1 555-0102", service: "Lab Test", status: "called", joinedAt: new Date(Date.now() - 15 * 60000), position: 1 },
    { id: 3, ticket: "A044", name: "Maria C.", email: "maria@email.com", phone: "+1 555-0103", service: "Specialist", status: "waiting", joinedAt: new Date(Date.now() - 10 * 60000), position: 2 },
    { id: 4, ticket: "C201", name: "David L.", email: "david@email.com", phone: "+1 555-0104", service: "Pharmacy", status: "waiting", joinedAt: new Date(Date.now() - 5 * 60000), position: 3 },
  ]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: "" });
  const [myTicket, setMyTicket] = useState(null);
  const [errors, setErrors] = useState({});
  const [joinMethod, setJoinMethod] = useState("form"); // form | qr
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState(null);
  const [adminFilter, setAdminFilter] = useState("all");
  const [showBizPicker, setShowBizPicker] = useState(false);

  const biz = BUSINESS_TYPES[businessType];
  const waitingQueue = queue.filter((q) => q.status === "waiting" || q.status === "called");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Valid email required";
    if (!form.phone.match(/^[\+\d\s\-\(\)]{7,}$/)) e.phone = "Valid phone required";
    if (!form.service) e.service = "Please select a service";
    return e;
  };

  const handleJoin = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const pos = waitingQueue.length + 1;
    const ticket = generateTicket();
    const entry = {
      id: Date.now(),
      ticket,
      name: form.name,
      email: form.email,
      phone: form.phone,
      service: form.service,
      status: "waiting",
      joinedAt: new Date(),
      position: pos,
    };
    setQueue((q) => [...q, entry]);
    setMyTicket(entry);
    setForm({ name: "", email: "", phone: "", service: "" });
    setErrors({});
    setView("ticket");
  };

  const callNext = () => {
    const next = queue.find((q) => q.status === "waiting");
    if (!next) { showToast("No one waiting in queue", "info"); return; }
    setQueue((q) => q.map((e) => e.id === next.id ? { ...e, status: "called" } : e.status === "serving" ? { ...e, status: "done" } : e));
    showToast(`Calling ${next.ticket} — ${next.name}`);
  };

  const markServing = (id) => setQueue((q) => q.map((e) => e.id === id ? { ...e, status: "serving" } : e));
  const markDone = (id) => {
    setQueue((q) => q.map((e) => e.id === id ? { ...e, status: "done" } : e));
    showToast("Patient marked as done ✓");
  };
  const removeEntry = (id) => setQueue((q) => q.filter((e) => e.id !== id));

  const myPos = myTicket ? queue.findIndex((q) => q.id === myTicket.id) : -1;
  const waitAhead = myPos > 0 ? queue.slice(0, myPos).filter((q) => q.status !== "done").length : 0;
  const estWait = waitAhead * biz.avgTime;

  const filteredQueue = adminFilter === "all" ? queue : queue.filter((q) => q.status === adminFilter);

  const accentColor = biz.color;

  // Styles
  const S = {
    app: { minHeight: "100vh", background: "#F8FAFC", fontFamily: "'DM Sans', sans-serif", position: "relative" },
    nav: { background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 100 },
    logo: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
    logoIcon: { width: 36, height: 36, borderRadius: 10, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
    logoText: { fontWeight: 800, fontSize: 18, color: "#0F172A", letterSpacing: -0.5 },
    navLinks: { display: "flex", gap: 4 },
    navBtn: (active) => ({ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: active ? accentColor : "transparent", color: active ? "#fff" : "#64748B", transition: "all .2s" }),
    main: { maxWidth: 1100, margin: "0 auto", padding: "40px 24px" },
    hero: { textAlign: "center", marginBottom: 48 },
    heroTitle: { fontSize: 48, fontWeight: 900, color: "#0F172A", letterSpacing: -2, lineHeight: 1.1, margin: "0 0 12px" },
    heroSub: { fontSize: 18, color: "#64748B", fontWeight: 400 },
    accentSpan: { color: accentColor },
    bizGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, margin: "32px 0" },
    bizCard: (active, color) => ({ border: `2px solid ${active ? color : "#E2E8F0"}`, borderRadius: 16, padding: "20px 16px", cursor: "pointer", background: active ? color + "12" : "#fff", textAlign: "center", transition: "all .2s", transform: active ? "scale(1.03)" : "scale(1)" }),
    bizIcon: { fontSize: 32, marginBottom: 8 },
    bizLabel: (active, color) => ({ fontWeight: 700, fontSize: 14, color: active ? color : "#374151" }),
    statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 },
    statCard: { background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #E2E8F0" },
    statNum: { fontSize: 36, fontWeight: 900, color: "#0F172A", letterSpacing: -1 },
    statLabel: { fontSize: 13, color: "#94A3B8", fontWeight: 500, marginTop: 2 },
    card: { background: "#fff", borderRadius: 20, border: "1px solid #E2E8F0", padding: 32, marginBottom: 24 },
    label: { fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" },
    input: (err) => ({ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${err ? "#EF4444" : "#E2E8F0"}`, fontSize: 15, outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border .2s" }),
    errText: { color: "#EF4444", fontSize: 12, marginTop: 4 },
    btn: (variant) => ({
      padding: variant === "sm" ? "8px 16px" : "12px 24px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: variant === "sm" ? 13 : 15,
      fontFamily: "inherit",
      transition: "all .15s",
    }),
    primaryBtn: { background: accentColor, color: "#fff" },
    outlineBtn: { background: "transparent", color: accentColor, border: `2px solid ${accentColor}` },
    ghostBtn: { background: "#F1F5F9", color: "#374151" },
    dangerBtn: { background: "#FEE2E2", color: "#DC2626" },
    ticketCard: { background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)`, border: `2px solid ${accentColor}30`, borderRadius: 24, padding: 32, textAlign: "center" },
    ticketNum: { fontSize: 64, fontWeight: 900, color: accentColor, letterSpacing: -2, lineHeight: 1 },
    queueRow: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, border: "1px solid #E2E8F0", marginBottom: 8, background: "#fff" },
    posNum: { width: 32, height: 32, borderRadius: 8, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#64748B", flexShrink: 0 },
    ticketBadge: { fontWeight: 800, fontSize: 15, color: accentColor, fontFamily: "monospace", width: 56, flexShrink: 0 },
    queueInfo: { flex: 1, minWidth: 0 },
    queueName: { fontWeight: 600, fontSize: 14, color: "#0F172A" },
    queueSub: { fontSize: 12, color: "#94A3B8", marginTop: 1 },
    actionRow: { display: "flex", gap: 6, flexShrink: 0 },
    displayBoard: { background: "#0F172A", minHeight: "100vh", fontFamily: "inherit" },
    boardHeader: { background: accentColor, padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    boardTitle: { fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -1 },
    nowServing: { background: "#fff", borderRadius: 20, padding: 32, margin: "32px 40px 0", display: "flex", alignItems: "center", gap: 24 },
    nowNum: { fontSize: 80, fontWeight: 900, color: accentColor, letterSpacing: -3, lineHeight: 1 },
    queueList: { margin: "24px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 },
    queueChip: { background: "#1E293B", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    chiptick: { fontFamily: "monospace", fontSize: 20, fontWeight: 800, color: "#fff" },
    chippos: { fontSize: 12, color: "#64748B" },
    toast: (type) => ({ position: "fixed", bottom: 24, right: 24, background: type === "success" ? "#10B981" : type === "info" ? "#3B82F6" : "#EF4444", color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,.15)", animation: "fadeUp .3s ease" }),
    select: { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 15, fontFamily: "inherit", background: "#fff", outline: "none", boxSizing: "border-box" },
    divider: { height: 1, background: "#E2E8F0", margin: "24px 0" },
    tab: (active) => ({ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit", background: active ? "#0F172A" : "#F1F5F9", color: active ? "#fff" : "#64748B", transition: "all .15s" }),
    sectionTitle: { fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: -0.5, marginBottom: 20 },
    joinMethodRow: { display: "flex", gap: 8, marginBottom: 28 },
  };

  const currentlyServing = queue.find((q) => q.status === "serving");
  const currentlyCalled = queue.find((q) => q.status === "called");
  const waitingCount = queue.filter((q) => q.status === "waiting").length;
  const doneCount = queue.filter((q) => q.status === "done").length;

  // ───── VIEWS ─────

  if (view === "display") {
    return (
      <div style={S.displayBoard}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap'); * { margin:0; padding:0; box-sizing:border-box; }`}</style>
        <div style={S.boardHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 32 }}>{biz.icon}</span>
            <div>
              <div style={S.boardTitle}>{biz.label} Queue</div>
              <div style={{ color: "rgba(255,255,255,.75)", fontSize: 14 }}>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, color: "#fff" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{waitingCount}</div>
              <div style={{ fontSize: 12, opacity: .75 }}>Waiting</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{formatTime(waitingCount * biz.avgTime)}</div>
              <div style={{ fontSize: 12, opacity: .75 }}>Est. Wait</div>
            </div>
          </div>
        </div>

        <div style={S.nowServing}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Now Serving</div>
            <div style={S.nowNum}>{currentlyServing?.ticket || "—"}</div>
            <div style={{ fontSize: 18, color: "#374151", fontWeight: 600, marginTop: 4 }}>{currentlyServing?.service || "Standby"}</div>
          </div>
          {currentlyCalled && (
            <div style={{ marginLeft: "auto", paddingLeft: 32, borderLeft: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#3B82F6", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Next Up</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: "#3B82F6", letterSpacing: -2 }}>{currentlyCalled.ticket}</div>
              <div style={{ fontSize: 16, color: "#64748B", fontWeight: 600 }}>Please proceed to counter</div>
            </div>
          )}
        </div>

        <div style={{ padding: "20px 40px 0", color: "#94A3B8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Queue ({waitingCount} waiting)</div>
        <div style={S.queueList}>
          {queue.filter((q) => q.status === "waiting").map((e, i) => (
            <div key={e.id} style={S.queueChip}>
              <div>
                <div style={S.chiptick}>{e.ticket}</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{e.service}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: accentColor, fontWeight: 700 }}>~{formatTime((i + 1) * biz.avgTime)}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>ETA {getETA(i + 1, biz.avgTime)}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", padding: 32, color: "#334155", fontSize: 13 }}>
          <button onClick={() => setView("home")} style={{ ...S.btn(), background: "#1E293B", color: "#94A3B8", border: "none", cursor: "pointer", fontFamily: "inherit" }}>← Back to Admin</button>
        </div>
      </div>
    );
  }

  if (view === "ticket" && myTicket) {
    const pos = queue.findIndex((q) => q.id === myTicket.id);
    const currentStatus = queue[pos]?.status;
    return (
      <div style={S.app}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap'); * { margin:0; padding:0; box-sizing:border-box; } @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} } @keyframes fadeUp { from{transform:translateY(16px);opacity:0} to{transform:none;opacity:1} }`}</style>
        {toast && <div style={S.toast(toast.type)}>{toast.msg}</div>}
        <nav style={S.nav}>
          <div style={S.logo} onClick={() => setView("home")}>
            <div style={S.logoIcon}>{biz.icon}</div>
            <span style={S.logoText}>QueueFlow</span>
          </div>
        </nav>
        <div style={{ ...S.main, maxWidth: 480 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1 }}>Your Queue Ticket</div>
          </div>

          <div style={S.ticketCard}>
            <div style={{ fontSize: 13, color: accentColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{biz.label}</div>
            <div style={{ ...S.ticketNum, animation: currentStatus === "called" ? "pulse 1s infinite" : "none" }}>{myTicket.ticket}</div>
            <div style={{ marginTop: 12, marginBottom: 20 }}><StatusBadge status={currentStatus} /></div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <QRCodeSVG value={myTicket.ticket} size={120} />
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: "#94A3B8" }}>Scan to check status at the venue</div>
          </div>

          <div style={{ ...S.card, marginTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginBottom: 4 }}>SERVICE</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{myTicket.service}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginBottom: 4 }}>QUEUE POSITION</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>#{waitAhead + 1}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginBottom: 4 }}>EST. WAIT TIME</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: accentColor }}>{formatTime(estWait)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginBottom: 4 }}>ESTIMATED AT</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{getETA(waitAhead + 1, biz.avgTime)}</div>
              </div>
            </div>
            {currentStatus === "called" && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#DBEAFE", borderRadius: 10, color: "#1D4ED8", fontWeight: 700, textAlign: "center", animation: "pulse 1.2s infinite" }}>
                📢 Your number has been called! Please proceed to the counter.
              </div>
            )}
            {currentStatus === "serving" && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#D1FAE5", borderRadius: 10, color: "#065F46", fontWeight: 700, textAlign: "center" }}>
                ✅ You're currently being served!
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setView("home")} style={{ ...S.btn(), ...S.ghostBtn, flex: 1, fontFamily: "inherit" }}>Home</button>
            <button onClick={() => setView("join")} style={{ ...S.btn(), ...S.primaryBtn, flex: 1, fontFamily: "inherit" }}>Join Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        @keyframes fadeUp { from{transform:translateY(16px);opacity:0} to{transform:none;opacity:1} }
        input:focus, select:focus { border-color: ${accentColor} !important; box-shadow: 0 0 0 3px ${accentColor}20; }
        button:hover { opacity:.88; }
      `}</style>
      {toast && <div style={S.toast(toast.type)}>{toast.msg}</div>}

      <nav style={S.nav}>
        <div style={S.logo} onClick={() => setView("home")}>
          <div style={S.logoIcon}>{biz.icon}</div>
          <span style={S.logoText}>QueueFlow</span>
          <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>{biz.label}</span>
        </div>
        <div style={S.navLinks}>
          <button style={{ ...S.navBtn(view === "home") }} onClick={() => setView("home")}>Home</button>
          <button style={{ ...S.navBtn(view === "join") }} onClick={() => setView("join")}>Join Queue</button>
          <button style={{ ...S.navBtn(view === "admin") }} onClick={() => setView("admin")}>Admin</button>
          <button style={{ ...S.navBtn(view === "display"), background: view === "display" ? "#0F172A" : "transparent", color: view === "display" ? "#fff" : "#64748B" }} onClick={() => setView("display")}>Display Board</button>
        </div>
      </nav>

      <div style={S.main}>

        {/* ── HOME ── */}
        {view === "home" && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            <div style={S.hero}>
              <div style={{ display: "inline-block", background: accentColor + "15", color: accentColor, padding: "4px 16px", borderRadius: 99, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
                Smart Queue Management
              </div>
              <h1 style={S.heroTitle}>Skip the <span style={S.accentSpan}>waiting</span>,<br />not the service.</h1>
              <p style={S.heroSub}>Join from anywhere, track your spot, get notified when it's your turn.</p>
            </div>

            <div style={{ textAlign: "center", marginBottom: 16, fontSize: 14, fontWeight: 600, color: "#64748B" }}>Choose your venue type</div>
            <div style={S.bizGrid}>
              {Object.entries(BUSINESS_TYPES).map(([key, b]) => (
                <div key={key} style={S.bizCard(businessType === key, b.color)} onClick={() => setBusinessType(key)}>
                  <div style={S.bizIcon}>{b.icon}</div>
                  <div style={S.bizLabel(businessType === key, b.color)}>{b.label}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>~{b.avgTime} min avg</div>
                </div>
              ))}
            </div>

            <div style={S.statsRow}>
              <div style={S.statCard}>
                <div style={S.statNum}>{waitingCount}</div>
                <div style={S.statLabel}>Currently Waiting</div>
              </div>
              <div style={S.statCard}>
                <div style={{ ...S.statNum, color: accentColor }}>{formatTime(waitingCount * biz.avgTime)}</div>
                <div style={S.statLabel}>Estimated Wait</div>
              </div>
              <div style={S.statCard}>
                <div style={S.statNum}>{currentlyServing ? "1" : "0"}</div>
                <div style={S.statLabel}>Now Serving</div>
              </div>
              <div style={S.statCard}>
                <div style={{ ...S.statNum, color: "#10B981" }}>{doneCount}</div>
                <div style={S.statLabel}>Served Today</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ ...S.card, textAlign: "center", background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, cursor: "pointer" }} onClick={() => setView("join")}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✋</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#fff", marginBottom: 6 }}>Join Queue</div>
                <div style={{ color: "rgba(255,255,255,.8)", fontSize: 14 }}>Fill your details and reserve your spot</div>
              </div>
              <div style={{ ...S.card, textAlign: "center", cursor: "pointer" }} onClick={() => setView("display")}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📺</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#0F172A", marginBottom: 6 }}>Display Board</div>
                <div style={{ color: "#94A3B8", fontSize: 14 }}>Live queue status for in-venue screen</div>
              </div>
            </div>
          </div>
        )}

        {/* ── JOIN ── */}
        {view === "join" && (
          <div style={{ animation: "fadeUp .4s ease", maxWidth: 560, margin: "0 auto" }}>
            <button onClick={() => setView("home")} style={{ ...S.btn("sm"), ...S.ghostBtn, fontFamily: "inherit", marginBottom: 24 }}>← Back</button>
            <h2 style={{ fontSize: 30, fontWeight: 900, color: "#0F172A", letterSpacing: -1, marginBottom: 6 }}>Join the Queue</h2>
            <p style={{ color: "#64748B", marginBottom: 24 }}>Fill in your details to reserve your spot. You'll get an estimated wait time.</p>

            <div style={S.joinMethodRow}>
              <button style={{ ...S.tab(joinMethod === "form") }} onClick={() => setJoinMethod("form")}>📝 Fill Form</button>
              <button style={{ ...S.tab(joinMethod === "qr") }} onClick={() => setJoinMethod("qr")}>📱 Scan QR</button>
            </div>

            {joinMethod === "qr" && (
              <div style={{ ...S.card, textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Scan to join on your phone</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <QRCodeSVG value={`queueflow-join-${businessType}`} size={200} />
                </div>
                <div style={{ fontSize: 14, color: "#64748B" }}>Scan this QR code to join the queue from your phone, or switch to the form to fill in your details.</div>
                <button style={{ ...S.btn(), ...S.primaryBtn, marginTop: 20, fontFamily: "inherit" }} onClick={() => setJoinMethod("form")}>Fill form instead →</button>
              </div>
            )}

            {joinMethod === "form" && (
              <div style={S.card}>
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Full Name</label>
                  <input style={S.input(errors.name)} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Smith" />
                  {errors.name && <div style={S.errText}>{errors.name}</div>}
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Email Address</label>
                  <input style={S.input(errors.email)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" type="email" />
                  {errors.email && <div style={S.errText}>{errors.email}</div>}
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Phone Number</label>
                  <input style={S.input(errors.phone)} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555-000-0000" type="tel" />
                  {errors.phone && <div style={S.errText}>{errors.phone}</div>}
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label style={S.label}>Service Required</label>
                  <select style={{ ...S.select, borderColor: errors.service ? "#EF4444" : "#E2E8F0" }} value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                    <option value="">Select a service...</option>
                    {biz.services.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.service && <div style={S.errText}>{errors.service}</div>}
                </div>

                <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 16, marginBottom: 24, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>📊 Queue Snapshot</div>
                  <div style={{ display: "flex", gap: 24 }}>
                    <div><span style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>{waitingCount + 1}</span><span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 4 }}>Your est. position</span></div>
                    <div><span style={{ fontSize: 20, fontWeight: 800, color: accentColor }}>{formatTime((waitingCount + 1) * biz.avgTime)}</span><span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 4 }}>Est. wait</span></div>
                    <div><span style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>{getETA(waitingCount + 1, biz.avgTime)}</span><span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 4 }}>Est. time</span></div>
                  </div>
                </div>

                <button style={{ ...S.btn(), ...S.primaryBtn, width: "100%", fontFamily: "inherit" }} onClick={handleJoin}>
                  Confirm & Get My Ticket →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ADMIN ── */}
        {view === "admin" && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <div>
                <h2 style={{ fontSize: 28, fontWeight: 900, color: "#0F172A", letterSpacing: -1 }}>Queue Management</h2>
                <p style={{ color: "#64748B", fontSize: 14, marginTop: 2 }}>{biz.icon} {biz.label} · {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p>
              </div>
              <button onClick={callNext} style={{ ...S.btn(), background: accentColor, color: "#fff", fontFamily: "inherit", fontSize: 15, padding: "12px 28px" }}>
                📢 Call Next
              </button>
            </div>

            <div style={S.statsRow}>
              {[{ label: "Waiting", val: waitingCount, color: "#F59E0B" }, { label: "Being Served", val: queue.filter((q) => q.status === "serving").length, color: accentColor }, { label: "Called", val: queue.filter((q) => q.status === "called").length, color: "#3B82F6" }, { label: "Done Today", val: doneCount, color: "#10B981" }].map((s) => (
                <div key={s.label} style={S.statCard}>
                  <div style={{ ...S.statNum, color: s.color }}>{s.val}</div>
                  <div style={S.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["all", "waiting", "called", "serving", "done"].map((f) => (
                <button key={f} style={{ ...S.tab(adminFilter === f), fontFamily: "inherit" }} onClick={() => setAdminFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  <span style={{ marginLeft: 6, background: "rgba(0,0,0,.12)", padding: "1px 6px", borderRadius: 99, fontSize: 11 }}>
                    {f === "all" ? queue.length : queue.filter((q) => q.status === f).length}
                  </span>
                </button>
              ))}
            </div>

            <div>
              {filteredQueue.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                  <div style={{ fontWeight: 600 }}>Queue is clear!</div>
                </div>
              )}
              {filteredQueue.map((e, i) => (
                <div key={e.id} style={{ ...S.queueRow, borderLeft: e.status === "serving" ? `4px solid ${accentColor}` : e.status === "called" ? "4px solid #3B82F6" : "1px solid #E2E8F0" }}>
                  <div style={S.posNum}>{i + 1}</div>
                  <div style={S.ticketBadge}>{e.ticket}</div>
                  <div style={S.queueInfo}>
                    <div style={S.queueName}>{e.name}</div>
                    <div style={S.queueSub}>{e.service} · {e.phone} · {e.email}</div>
                    <div style={{ ...S.queueSub, marginTop: 2 }}>
                      Joined {e.joinedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {e.status === "waiting" && <span style={{ color: accentColor, fontWeight: 600 }}> · Est. {getETA(i + 1, biz.avgTime)}</span>}
                    </div>
                  </div>
                  <div><StatusBadge status={e.status} /></div>
                  <div style={S.actionRow}>
                    {e.status === "called" && <button style={{ ...S.btn("sm"), background: "#D1FAE5", color: "#065F46", fontFamily: "inherit" }} onClick={() => markServing(e.id)}>Serve</button>}
                    {e.status === "serving" && <button style={{ ...S.btn("sm"), background: "#D1FAE5", color: "#065F46", fontFamily: "inherit" }} onClick={() => markDone(e.id)}>✓ Done</button>}
                    <button style={{ ...S.btn("sm"), ...S.dangerBtn, fontFamily: "inherit" }} onClick={() => removeEntry(e.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
