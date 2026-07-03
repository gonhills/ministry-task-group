import React, { useState } from "react";

/* ------------------------------------------------------------------ */
/*  First UMC Ridgecrest — Small Groups prototype (fully editable)     */
/*  Admin view can edit every field, add/remove volunteers, tasks,     */
/*  instructions, inventory, and create new groups and activities.     */
/* ------------------------------------------------------------------ */

const C = {
  paper: "#F7F4EC",
  card: "#FFFFFF",
  ink: "#26302B",
  inkSoft: "#5C665F",
  line: "#E4DFD2",
  pine: "#3D5A48",
  pineDark: "#2C4335",
  amber: "#C98A2D",
  amberSoft: "#F4E3C4",
  danger: "#A64B3A",
};

const SWATCHES = ["#C98A2D", "#6F4E37", "#56789B", "#3D5A48", "#A64B3A", "#7C5CA8", "#B0713F", "#4E8A7E"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ICONS = ["✦", "☕", "❋", "✚", "♪", "❀", "✉", "☀"];

const uid = () => Math.random().toString(36).slice(2, 9);

const tint = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * 0.86);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `rgb(${r},${g},${b})`;
};

/* ----------------------------- seed data --------------------------- */

const SEED_TEAMS = [
  {
    id: "children",
    name: "Children's Ministry Team",
    color: "#C98A2D",
    icon: "✦",
    goal: "Engage local children in the area and help them grow in their faith through lessons, crafts, and play.",
    lead: "Maria Thompson",
    volunteers: ["Maria Thompson", "James Okafor", "Ruth Alvarez", "Daniel Kim", "Sophie Bell"],
  },
  {
    id: "coffee",
    name: "Coffee Ministry Team",
    color: "#6F4E37",
    icon: "☕",
    goal: "Welcome every member with warm hospitality — coffee and conversation after Sunday service, every week.",
    lead: "Gerald Nwosu",
    volunteers: ["Gerald Nwosu", "Patty Larson", "Ken Whitfield", "Amara Diaz"],
  },
  {
    id: "lunch",
    name: "Wednesday Friends Lunch Team",
    color: "#56789B",
    icon: "❋",
    goal: "Give seniors in our congregation company and care — we eat together, pray together, and spend time together.",
    lead: "Dorothy Hayes",
    volunteers: ["Dorothy Hayes", "Frank Miller", "Grace Chen", "Leon Baptiste"],
  },
];

const SEED_EVENTS = [
  {
    id: "e1",
    teamId: "coffee",
    title: "Sunday Coffee Fellowship",
    day: "Sunday",
    date: "Jul 5",
    time: "11:30 AM – 1:00 PM",
    location: "Fellowship Hall",
    status: "upcoming",
    goal: "Make sure no one leaves worship without a warm cup and a warm word. Target: serve 80+ members and greet every first-time visitor by name.",
    instructions: [
      "Arrive by 10:45 AM to unlock the Fellowship Hall kitchen.",
      "Brew three urns: regular, decaf, and hot water for tea.",
      "Set the serving table with cups, creamer, sugar, and the donation basket.",
      "Two volunteers stay at the table to pour and greet; look for new faces.",
      "Wipe down, wash urns, and lock up by 1:00 PM.",
    ],
    tasks: [
      { id: "t1", name: "Brew coffee (3 urns)", assignee: "Patty Larson", done: false },
      { id: "t2", name: "Set up serving table", assignee: null, done: false },
      { id: "t3", name: "Bring creamer & cookies", assignee: "Ken Whitfield", done: true },
      { id: "t4", name: "Greeter at the table", assignee: null, done: false },
      { id: "t5", name: "Cleanup crew", assignee: "Amara Diaz", done: false },
    ],
    inventory: [
      { id: "i1", item: "Ground coffee (lbs)", have: 4, need: 6 },
      { id: "i2", item: "Paper cups", have: 220, need: 150 },
      { id: "i3", item: "Creamer bottles", have: 2, need: 4 },
      { id: "i4", item: "Sugar packets", have: 300, need: 150 },
    ],
    report: null,
  },
  {
    id: "e2",
    teamId: "lunch",
    title: "Wednesday Friends Lunch",
    day: "Wednesday",
    date: "Jul 8",
    time: "12:00 PM – 1:30 PM",
    location: "Rosa's Kitchen (offsite)",
    status: "upcoming",
    goal: "Company and care for our seniors. Everyone shares a meal, we open and close in prayer, and no one eats alone this Wednesday.",
    instructions: [
      "Call the confirmed list on Tuesday to remind everyone and check ride needs.",
      "Reserve the long table at Rosa's for 14 by Monday evening.",
      "Drivers pick up at 11:30 AM; meet in the church parking lot first.",
      "Dorothy opens with prayer; lunch and conversation follow.",
      "Close with a short prayer and prayer requests. Drivers return everyone home.",
    ],
    tasks: [
      { id: "t6", name: "Reminder calls (Tuesday)", assignee: "Grace Chen", done: true },
      { id: "t7", name: "Reserve table for 14", assignee: "Dorothy Hayes", done: true },
      { id: "t8", name: "Driver — north side pickups", assignee: "Frank Miller", done: false },
      { id: "t9", name: "Driver — south side pickups", assignee: null, done: false },
      { id: "t10", name: "Collect prayer requests", assignee: null, done: false },
    ],
    inventory: [
      { id: "i5", item: "Ride seats available", have: 6, need: 8 },
      { id: "i6", item: "Large-print hymn sheets", have: 15, need: 14 },
    ],
    report: null,
  },
  {
    id: "e3",
    teamId: "children",
    title: "Kids' Summer Bible Adventure",
    day: "Saturday",
    date: "Jul 11",
    time: "10:00 AM – 12:00 PM",
    location: "Education Wing, Room 4",
    status: "upcoming",
    goal: "Lesson: the Parable of the Sower. Every child hears the story, makes the seed-jar craft, and leaves knowing they are welcome here. Target: 20 kids.",
    instructions: [
      "Set up Room 4 by 9:15 AM — circle rug, craft tables, check-in table at the door.",
      "Parents sign kids in at the check-in table; name tags for everyone.",
      "10:00 — welcome songs. 10:20 — Parable of the Sower story time.",
      "10:45 — seed-jar craft (soil, seeds, jars in the supply bin).",
      "11:30 — snack, then pickup. Two volunteers stay until the last child leaves.",
    ],
    tasks: [
      { id: "t11", name: "Print lesson plans & name tags", assignee: "Maria Thompson", done: true },
      { id: "t12", name: "Prep seed-jar craft kits (x20)", assignee: null, done: false },
      { id: "t13", name: "Snack duty (nut-free)", assignee: "Sophie Bell", done: false },
      { id: "t14", name: "Check-in table", assignee: null, done: false },
      { id: "t15", name: "Room setup & teardown", assignee: "Daniel Kim", done: false },
    ],
    inventory: [
      { id: "i7", item: "Craft jars", have: 12, need: 20 },
      { id: "i8", item: "Seed packets", have: 20, need: 20 },
      { id: "i9", item: "Juice boxes", have: 30, need: 24 },
      { id: "i10", item: "Name tag stickers", have: 40, need: 25 },
    ],
    report: null,
  },
  {
    id: "e0",
    teamId: "coffee",
    title: "Sunday Coffee Fellowship",
    day: "Sunday",
    date: "Jun 28",
    time: "11:30 AM – 1:00 PM",
    location: "Fellowship Hall",
    status: "past",
    goal: "Serve 80+ members after worship and greet every visitor.",
    instructions: [],
    tasks: [
      { id: "p1", name: "Brew coffee", assignee: "Patty Larson", done: true },
      { id: "p2", name: "Serving table", assignee: "Gerald Nwosu", done: true },
      { id: "p3", name: "Cleanup", assignee: "Amara Diaz", done: true },
    ],
    inventory: [],
    report: {
      attendance: 84,
      newVisitors: 3,
      highlights:
        "Two new families stayed for nearly an hour — connected the Ruiz family with the Children's Ministry team. Ran out of decaf by 12:15; ordering an extra pound next week.",
      followUps: "Call the Ruiz family this week. Restock decaf before Jul 5.",
    },
  },
];

const ACTIVITY_FEED = [
  { who: "Maria Thompson", what: "marked “Print lesson plans” complete", teamId: "children", when: "2h ago" },
  { who: "Dorothy Hayes", what: "reserved the table at Rosa's for 14", teamId: "lunch", when: "5h ago" },
  { who: "Gerald Nwosu", what: "filed the Jun 28 progress report", teamId: "coffee", when: "Yesterday" },
  { who: "Grace Chen", what: "finished Tuesday reminder calls", teamId: "lunch", when: "Yesterday" },
  { who: "Ken Whitfield", what: "signed up for “Bring creamer & cookies”", teamId: "coffee", when: "2d ago" },
];

/* ----------------------------- helpers ----------------------------- */

const progressOf = (ev) =>
  ev.tasks.length ? Math.round((ev.tasks.filter((t) => t.done).length / ev.tasks.length) * 100) : 0;
const openTasks = (ev) => ev.tasks.filter((t) => !t.assignee && !t.done);

const inputStyle = {
  border: `1px solid ${C.line}`,
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13.5,
  background: "#fff",
  color: C.ink,
  fontFamily: "inherit",
  width: "100%",
};

/* ------------------------------- app ------------------------------- */

export default function App() {
  const [view, setView] = useState("member"); // member | admin
  const [teams, setTeams] = useState(SEED_TEAMS);
  const [events, setEvents] = useState(SEED_EVENTS);
  const [openEventId, setOpenEventId] = useState(null);
  const [editingEvent, setEditingEvent] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [toast, setToast] = useState(null);

  const ping = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const teamById = (id) => teams.find((t) => t.id === id);

  /* ---- event updates ---- */
  const updateEvent = (id, patch) =>
    setEvents((evs) => evs.map((e) => (e.id === id ? { ...e, ...(typeof patch === "function" ? patch(e) : patch) } : e)));

  const deleteEvent = (id) => {
    setEvents((evs) => evs.filter((e) => e.id !== id));
    setOpenEventId(null);
    setEditingEvent(false);
    ping("Activity deleted");
  };

  const addEvent = () => {
    const team = teams[0];
    const ev = {
      id: uid(),
      teamId: team.id,
      title: "New activity",
      day: "Sunday",
      date: "Jul 12",
      time: "10:00 AM",
      location: "Fellowship Hall",
      status: "upcoming",
      goal: "",
      instructions: [],
      tasks: [],
      inventory: [],
      report: null,
    };
    setEvents((evs) => [ev, ...evs]);
    setOpenEventId(ev.id);
    setEditingEvent(true);
    ping("New activity created — fill in the details");
  };

  /* ---- team updates ---- */
  const updateTeam = (id, patch) =>
    setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, ...(typeof patch === "function" ? patch(t) : patch) } : t)));

  const addTeam = () => {
    const t = {
      id: uid(),
      name: "New small group",
      color: SWATCHES[teams.length % SWATCHES.length],
      icon: ICONS[teams.length % ICONS.length],
      goal: "",
      lead: "",
      volunteers: [],
    };
    setTeams((ts) => [...ts, t]);
    setShowTeams(true);
    ping("New group added — give it a name and a goal");
  };

  const deleteTeam = (id) => {
    if (events.some((e) => e.teamId === id)) {
      ping("Delete or reassign this group's activities first");
      return;
    }
    setTeams((ts) => ts.filter((t) => t.id !== id));
    ping("Group removed");
  };

  /* ---- member signup: also adds new names to the team roster ---- */
  const signup = (eventId, taskId, name) => {
    const ev = events.find((e) => e.id === eventId);
    updateEvent(eventId, (e) => ({
      tasks: e.tasks.map((t) => (t.id === taskId ? { ...t, assignee: name } : t)),
    }));
    const team = teamById(ev.teamId);
    if (team && !team.volunteers.includes(name)) {
      updateTeam(team.id, (t) => ({ volunteers: [...t.volunteers, name] }));
    }
    ping(`Thanks, ${name} — you're on it`);
  };

  const openEvent = events.find((e) => e.id === openEventId) || null;

  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink, fontFamily: "'Public Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        select, input, textarea { font-family: inherit; }
        .arch { border-radius: 999px 999px 18px 18px; }
        .card-hover { transition: transform .18s ease, box-shadow .18s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(38,48,43,.10); }
        @media (prefers-reduced-motion: reduce) { .card-hover, .card-hover:hover { transition: none; transform: none; } }
        button:focus-visible, select:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid ${C.amber}; outline-offset: 2px; }
      `}</style>

      {/* Header */}
      <header style={{ background: C.pineDark, color: "#F4F1E6", padding: "18px 20px 0" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.75 }}>
                First United Methodist Church · Ridgecrest
              </div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 30, margin: "4px 0 14px" }}>
                Ministry Task Group
              </h1>
            </div>
            <div style={{ display: "flex", background: "rgba(255,255,255,.12)", borderRadius: 999, padding: 4, marginBottom: 14 }}>
              {["member", "admin"].map((v) => (
                <button
                  key={v}
                  onClick={() => { setView(v); setOpenEventId(null); setEditingEvent(false); }}
                  style={{
                    border: "none", borderRadius: 999, padding: "8px 18px", fontSize: 13, fontWeight: 600,
                    background: view === v ? "#F4F1E6" : "transparent",
                    color: view === v ? C.pineDark : "#F4F1E6",
                  }}
                >
                  {v === "member" ? "Member view" : "Admin view"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 64px" }}>
        {openEvent ? (
          <EventDetail
            ev={openEvent}
            team={teamById(openEvent.teamId)}
            teams={teams}
            isAdmin={view === "admin"}
            editing={view === "admin" && editingEvent}
            setEditing={setEditingEvent}
            onBack={() => { setOpenEventId(null); setEditingEvent(false); }}
            onUpdate={(patch) => updateEvent(openEvent.id, patch)}
            onDelete={() => deleteEvent(openEvent.id)}
            onSignup={(taskId, name) => signup(openEvent.id, taskId, name)}
            ping={ping}
          />
        ) : view === "member" ? (
          <MemberHome teams={teams} events={events} onOpen={setOpenEventId} />
        ) : (
          <AdminHome
            teams={teams}
            events={events}
            showTeams={showTeams}
            setShowTeams={setShowTeams}
            onOpen={(id) => { setOpenEventId(id); setEditingEvent(false); }}
            onNewEvent={addEvent}
            onNewTeam={addTeam}
            onUpdateTeam={updateTeam}
            onDeleteTeam={deleteTeam}
            ping={ping}
          />
        )}
      </main>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: C.ink, color: "#fff", padding: "10px 20px", borderRadius: 999,
          fontSize: 13, fontWeight: 600, boxShadow: "0 8px 20px rgba(0,0,0,.25)", zIndex: 50,
          maxWidth: "90vw", textAlign: "center",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- member view -------------------------- */

function MemberHome({ teams, events, onOpen }) {
  const week = events.filter((e) => e.status === "upcoming");
  return (
    <div>
      <p style={{ fontFamily: "'Fraunces', serif", fontSize: 22, lineHeight: 1.35, maxWidth: 620, margin: "4px 0 26px" }}>
        This week at First UMC — ways to gather, serve, and belong.
      </p>

      <SectionLabel>This week</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>
        {week.length === 0 && (
          <div style={{ background: C.card, border: `1px dashed ${C.line}`, borderRadius: 14, padding: 24, fontSize: 13.5, color: C.inkSoft }}>
            No activities scheduled yet. Check back soon.
          </div>
        )}
        {week.map((ev) => {
          const team = teams.find((t) => t.id === ev.teamId) || teams[0];
          const open = openTasks(ev).length;
          return (
            <button
              key={ev.id}
              onClick={() => onOpen(ev.id)}
              className="arch card-hover"
              style={{ textAlign: "left", border: `1px solid ${C.line}`, background: C.card, padding: "34px 20px 20px", position: "relative", overflow: "hidden" }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: team.color }} />
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: team.color }}>
                {team.name}
              </div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: "6px 0 8px" }}>{ev.title}</div>
              <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6 }}>
                {ev.day}, {ev.date} · {ev.time}
                <br />
                {ev.location}
              </div>
              {open > 0 && (
                <div style={{ marginTop: 12, display: "inline-block", background: C.amberSoft, color: "#7A5416", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                  {open} volunteer spot{open > 1 ? "s" : ""} open
                </div>
              )}
            </button>
          );
        })}
      </div>

      <SectionLabel>Our small groups</SectionLabel>
      <div style={{ display: "grid", gap: 14 }}>
        {teams.map((team) => (
          <div key={team.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div className="arch" style={{ width: 44, height: 56, background: tint(team.color), color: team.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
              {team.icon}
            </div>
            <div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600 }}>{team.name}</div>
              <p style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.6, margin: "6px 0 8px" }}>{team.goal || "—"}</p>
              <div style={{ fontSize: 12, color: C.inkSoft }}>
                {team.lead ? <>Led by <strong style={{ color: C.ink }}>{team.lead}</strong> · </> : null}
                {team.volunteers.length} volunteer{team.volunteers.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- admin view --------------------------- */

function AdminHome({ teams, events, showTeams, setShowTeams, onOpen, onNewEvent, onNewTeam, onUpdateTeam, onDeleteTeam, ping }) {
  const upcoming = events.filter((e) => e.status === "upcoming");
  const past = events.filter((e) => e.status === "past");
  const allTasks = upcoming.flatMap((e) => e.tasks);
  const unassigned = allTasks.filter((t) => !t.assignee && !t.done).length;
  const doneCount = allTasks.filter((t) => t.done).length;
  const lowStock = upcoming.flatMap((e) =>
    e.inventory.filter((i) => i.have < i.need).map((i) => ({ ...i, event: e.title, date: e.date }))
  );

  return (
    <div>
      {/* Action bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        <button onClick={onNewEvent} style={btnPrimary}>+ New activity</button>
        <button onClick={onNewTeam} style={btnGhost}>+ New small group</button>
        <button onClick={() => setShowTeams(!showTeams)} style={btnGhost}>
          {showTeams ? "Hide groups & people" : "Manage groups & people"}
        </button>
      </div>

      {/* Team manager */}
      {showTeams && (
        <>
          <SectionLabel>Groups & people</SectionLabel>
          <div style={{ display: "grid", gap: 14, marginBottom: 36 }}>
            {teams.map((team) => (
              <TeamEditor key={team.id} team={team} onUpdate={(patch) => onUpdateTeam(team.id, patch)} onDelete={() => onDeleteTeam(team.id)} ping={ping} />
            ))}
          </div>
        </>
      )}

      {/* Stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 32 }}>
        <Stat label="Events this week" value={upcoming.length} />
        <Stat label="Tasks completed" value={`${doneCount} / ${allTasks.length}`} />
        <Stat label="Unassigned tasks" value={unassigned} alert={unassigned > 0} />
        <Stat label="Low-stock items" value={lowStock.length} alert={lowStock.length > 0} />
      </div>

      {/* Event readiness */}
      <SectionLabel>Event readiness</SectionLabel>
      <div style={{ display: "grid", gap: 12, marginBottom: 36 }}>
        {upcoming.map((ev) => {
          const team = teams.find((t) => t.id === ev.teamId) || teams[0];
          const pct = progressOf(ev);
          const open = openTasks(ev).length;
          return (
            <button key={ev.id} onClick={() => onOpen(ev.id)} className="card-hover"
              style={{ textAlign: "left", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: team.color }}>{team.name}</span>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600 }}>
                    {ev.title}{" "}
                    <span style={{ fontFamily: "'Public Sans', sans-serif", fontSize: 13, fontWeight: 500, color: C.inkSoft }}>· {ev.day} {ev.date}</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? C.pine : C.ink }}>{pct}% ready</div>
              </div>
              <div style={{ height: 8, background: C.paper, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: team.color, borderRadius: 999, transition: "width .3s ease" }} />
              </div>
              <div style={{ fontSize: 12, color: open ? "#7A5416" : C.inkSoft, marginTop: 8, fontWeight: open ? 700 : 500 }}>
                {open ? `${open} task${open > 1 ? "s" : ""} still unassigned` : "All tasks assigned"}{team.lead ? ` · Lead: ${team.lead}` : ""}
              </div>
            </button>
          );
        })}
      </div>

      {/* Inventory watch */}
      <SectionLabel>Inventory watch</SectionLabel>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", marginBottom: 36 }}>
        {lowStock.length === 0 && (
          <div style={{ padding: 18, fontSize: 13.5, color: C.inkSoft }}>All supplies are covered for this week's events.</div>
        )}
        {lowStock.map((i, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 18px", borderTop: idx ? `1px solid ${C.line}` : "none" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{i.item}</div>
              <div style={{ fontSize: 12, color: C.inkSoft }}>{i.event} · {i.date}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.danger }}>{i.have} of {i.need} needed</div>
          </div>
        ))}
      </div>

      {/* Lead activity */}
      <SectionLabel>Lead activity</SectionLabel>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", marginBottom: 36 }}>
        {ACTIVITY_FEED.map((a, idx) => {
          const team = teams.find((t) => t.id === a.teamId);
          return (
            <div key={idx} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "13px 18px", borderTop: idx ? `1px solid ${C.line}` : "none" }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: team ? team.color : C.inkSoft, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13.5 }}><strong>{a.who}</strong> {a.what}</span>
                <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{team ? team.name : ""} · {a.when}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress reports */}
      <SectionLabel>Progress reports</SectionLabel>
      <div style={{ display: "grid", gap: 12 }}>
        {past.length === 0 && (
          <div style={{ background: C.card, border: `1px dashed ${C.line}`, borderRadius: 14, padding: 20, fontSize: 13.5, color: C.inkSoft }}>
            No reports yet. Open a finished activity and file its progress report.
          </div>
        )}
        {past.map((ev) => {
          const team = teams.find((t) => t.id === ev.teamId) || teams[0];
          return (
            <button key={ev.id} onClick={() => onOpen(ev.id)} className="card-hover" style={{ textAlign: "left", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: team.color }}>{team.name}</span>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600 }}>{ev.title} · {ev.date}</div>
                </div>
                <span style={{ alignSelf: "flex-start", background: ev.report ? "#E7EFE8" : C.amberSoft, color: ev.report ? C.pine : "#7A5416", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                  {ev.report ? "Report filed" : "Report needed"}
                </span>
              </div>
              {ev.report && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, margin: "14px 0" }}>
                    <MiniStat label="Attendance" value={ev.report.attendance} />
                    <MiniStat label="New visitors" value={ev.report.newVisitors} />
                    <MiniStat label="Tasks completed" value={`${ev.tasks.filter((t) => t.done).length}/${ev.tasks.length}`} />
                  </div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.65, color: C.ink, margin: "0 0 8px" }}>{ev.report.highlights}</p>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: C.inkSoft, margin: 0 }}>
                    <strong style={{ color: C.ink }}>Follow-ups:</strong> {ev.report.followUps}
                  </p>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- team editor --------------------------- */

function TeamEditor({ team, onUpdate, onDelete, ping }) {
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const addVolunteer = () => {
    const n = newName.trim();
    if (!n) return;
    if (team.volunteers.includes(n)) { ping(`${n} is already on this team`); return; }
    onUpdate((t) => ({ volunteers: [...t.volunteers, n] }));
    setNewName("");
    ping(`${n} added to ${team.name}`);
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div className="arch" style={{ width: 44, height: 56, background: tint(team.color), color: team.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          {team.icon}
        </div>
        <div style={{ flex: "1 1 260px", display: "grid", gap: 10 }}>
          <Field label="Group name">
            <input style={inputStyle} value={team.name} onChange={(e) => onUpdate({ name: e.target.value })} />
          </Field>
          <Field label="Goal / purpose">
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={team.goal}
              onChange={(e) => onUpdate({ goal: e.target.value })} placeholder="What is this group for?" />
          </Field>
          <Field label="Group lead">
            <input style={inputStyle} value={team.lead} onChange={(e) => onUpdate({ lead: e.target.value })} placeholder="Who leads this group?" />
          </Field>

          <Field label="Color & icon">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {SWATCHES.map((s) => (
                <button key={s} onClick={() => onUpdate({ color: s })} aria-label={`Set color ${s}`}
                  style={{ width: 24, height: 24, borderRadius: 999, background: s, border: team.color === s ? `3px solid ${C.ink}` : "2px solid #fff", boxShadow: "0 0 0 1px " + C.line }} />
              ))}
              <span style={{ width: 10 }} />
              {ICONS.map((ic) => (
                <button key={ic} onClick={() => onUpdate({ icon: ic })} aria-label={`Set icon ${ic}`}
                  style={{ width: 28, height: 28, borderRadius: 8, background: team.icon === ic ? tint(team.color) : "transparent", border: `1px solid ${team.icon === ic ? team.color : C.line}`, color: team.color, fontSize: 14 }}>
                  {ic}
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Volunteers (${team.volunteers.length})`}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {team.volunteers.map((v) => (
                <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 999, padding: "5px 6px 5px 12px", fontSize: 12.5, fontWeight: 600 }}>
                  {v}
                  <button onClick={() => onUpdate((t) => ({ volunteers: t.volunteers.filter((x) => x !== v) }))}
                    aria-label={`Remove ${v}`}
                    style={{ border: "none", background: C.line, color: C.inkSoft, borderRadius: 999, width: 18, height: 18, fontSize: 11, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={newName} placeholder="Add a name"
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addVolunteer()} />
              <button onClick={addVolunteer} style={{ ...btnPrimary, padding: "8px 16px" }}>Add</button>
            </div>
          </Field>

          <div>
            {confirmDelete ? (
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12.5, color: C.danger, fontWeight: 700 }}>Remove this group?</span>
                <button onClick={onDelete} style={{ ...btnDanger, padding: "6px 14px" }}>Yes, remove</button>
                <button onClick={() => setConfirmDelete(false)} style={{ ...btnGhost, padding: "6px 14px" }}>Cancel</button>
              </span>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "none", color: C.danger, fontSize: 12.5, fontWeight: 700, padding: 0 }}>
                Remove group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- event detail -------------------------- */

function EventDetail({ ev, team, teams, isAdmin, editing, setEditing, onBack, onUpdate, onDelete, onSignup, ping }) {
  const pct = progressOf(ev);
  const [signupName, setSignupName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const t = team || teams[0];

  const setTask = (taskId, patch) =>
    onUpdate((e) => ({ tasks: e.tasks.map((x) => (x.id === taskId ? { ...x, ...patch } : x)) }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.pine, fontSize: 13.5, fontWeight: 700, padding: 0 }}>
          ← Back to {isAdmin ? "admin dashboard" : "this week"}
        </button>
        {isAdmin && (
          <button onClick={() => setEditing(!editing)} style={editing ? btnPrimary : btnGhost}>
            {editing ? "Done editing" : "✎ Edit this activity"}
          </button>
        )}
      </div>

      {/* Hero */}
      <div className="arch" style={{ background: tint(t.color), border: `1px solid ${C.line}`, padding: "44px 24px 24px", textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 26, color: t.color }}>{t.icon}</div>
        {editing ? (
          <div style={{ maxWidth: 480, margin: "10px auto 0", display: "grid", gap: 8, textAlign: "left" }}>
            <Field label="Small group">
              <select style={inputStyle} value={ev.teamId} onChange={(e) => onUpdate({ teamId: e.target.value })}>
                {teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
            <Field label="Activity name">
              <input style={{ ...inputStyle, fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600 }} value={ev.title} onChange={(e) => onUpdate({ title: e.target.value })} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Day">
                <select style={inputStyle} value={ev.day} onChange={(e) => onUpdate({ day: e.target.value })}>
                  {DAYS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Date">
                <input style={inputStyle} value={ev.date} onChange={(e) => onUpdate({ date: e.target.value })} placeholder="Jul 12" />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Time">
                <input style={inputStyle} value={ev.time} onChange={(e) => onUpdate({ time: e.target.value })} placeholder="10:00 AM" />
              </Field>
              <Field label="Location">
                <input style={inputStyle} value={ev.location} onChange={(e) => onUpdate({ location: e.target.value })} />
              </Field>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: t.color, margin: "8px 0 4px" }}>
              {t.name}
            </div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, margin: "0 0 10px" }}>{ev.title}</h2>
            <div style={{ fontSize: 14, color: C.inkSoft }}>{ev.day}, {ev.date} · {ev.time} · {ev.location}</div>
          </>
        )}
      </div>

      {/* Goal */}
      <SectionLabel>The goal</SectionLabel>
      {editing ? (
        <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical", marginBottom: 28 }} value={ev.goal}
          onChange={(e) => onUpdate({ goal: e.target.value })}
          placeholder="What is the ultimate goal of this activity?" />
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderLeft: `4px solid ${t.color}`, borderRadius: 12, padding: "16px 18px", fontSize: 14.5, lineHeight: 1.7, marginBottom: 28 }}>
          {ev.goal || <span style={{ color: C.inkSoft }}>No goal written yet.</span>}
        </div>
      )}

      {/* Instructions */}
      {(ev.instructions.length > 0 || editing) && (
        <>
          <SectionLabel>How this event runs</SectionLabel>
          <ol style={{ margin: editing ? "0 0 10px" : "0 0 28px", padding: 0, listStyle: "none" }}>
            {ev.instructions.map((step, i) => (
              <li key={i} style={{ display: "flex", gap: 14, alignItems: editing ? "center" : "flex-start", padding: "12px 0", borderBottom: `1px solid ${C.line}`, fontSize: 14, lineHeight: 1.6 }}>
                <span style={{ width: 26, height: 26, borderRadius: 999, background: tint(t.color), color: t.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                  {i + 1}
                </span>
                {editing ? (
                  <>
                    <input style={{ ...inputStyle, flex: 1 }} value={step}
                      onChange={(e) => onUpdate((x) => ({ instructions: x.instructions.map((s, j) => (j === i ? e.target.value : s)) }))} />
                    <button onClick={() => onUpdate((x) => ({ instructions: x.instructions.filter((_, j) => j !== i) }))}
                      aria-label="Remove step" style={removeBtn}>×</button>
                  </>
                ) : step}
              </li>
            ))}
          </ol>
          {editing && (
            <button onClick={() => onUpdate((x) => ({ instructions: [...x.instructions, ""] }))} style={{ ...btnGhost, marginBottom: 28 }}>
              + Add a step
            </button>
          )}
        </>
      )}

      {/* Tasks */}
      <SectionLabel>{isAdmin ? "Delegate tasks" : "Volunteer roles"} · {pct}% done</SectionLabel>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", marginBottom: editing ? 10 : 28 }}>
        {ev.tasks.length === 0 && (
          <div style={{ padding: 16, fontSize: 13.5, color: C.inkSoft }}>No tasks yet.</div>
        )}
        {ev.tasks.map((task, idx) => (
          <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: idx ? `1px solid ${C.line}` : "none", flexWrap: "wrap" }}>
            {isAdmin && (
              <input type="checkbox" checked={task.done} onChange={() => setTask(task.id, { done: !task.done })}
                style={{ width: 18, height: 18, accentColor: t.color, cursor: "pointer" }} aria-label={`Mark ${task.name} done`} />
            )}
            <div style={{ flex: "1 1 180px" }}>
              {editing ? (
                <input style={inputStyle} value={task.name} onChange={(e) => setTask(task.id, { name: e.target.value })} />
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 600, textDecoration: task.done ? "line-through" : "none", color: task.done ? C.inkSoft : C.ink }}>
                    {task.name}
                  </div>
                  <div style={{ fontSize: 12, color: task.assignee ? C.inkSoft : "#7A5416", fontWeight: task.assignee ? 500 : 700 }}>
                    {task.done ? "Done" : task.assignee ? `Assigned to ${task.assignee}` : "Needs a volunteer"}
                  </div>
                </>
              )}
            </div>
            {isAdmin ? (
              <>
                <select value={task.assignee || ""} onChange={(e) => { setTask(task.id, { assignee: e.target.value || null }); if (e.target.value) ping(`Assigned to ${e.target.value}`); }}
                  style={{ ...inputStyle, width: "auto", background: C.paper }} aria-label={`Assign ${task.name}`}>
                  <option value="">Unassigned</option>
                  {t.volunteers.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {editing && (
                  <button onClick={() => onUpdate((x) => ({ tasks: x.tasks.filter((y) => y.id !== task.id) }))}
                    aria-label="Remove task" style={removeBtn}>×</button>
                )}
              </>
            ) : (
              !task.assignee && !task.done && (
                <button onClick={() => onSignup(task.id, signupName.trim() || "A friend of the church")}
                  style={{ background: t.color, color: "#fff", border: "none", borderRadius: 999, padding: "8px 16px", fontSize: 13, fontWeight: 700 }}>
                  I can help
                </button>
              )
            )}
          </div>
        ))}
      </div>
      {isAdmin && (
        <button onClick={() => onUpdate((x) => ({ tasks: [...x.tasks, { id: uid(), name: "New task", assignee: null, done: false }] }))}
          style={{ ...btnGhost, marginBottom: 28 }}>
          + Add a task
        </button>
      )}

      {!isAdmin && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 28, flexWrap: "wrap" }}>
          <label htmlFor="signup-name" style={{ fontSize: 13, color: C.inkSoft }}>Signing up as:</label>
          <input id="signup-name" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Your name"
            style={{ ...inputStyle, width: "auto" }} />
        </div>
      )}

      {/* Inventory */}
      {(ev.inventory.length > 0 || editing) && (
        <>
          <SectionLabel>Supplies & inventory</SectionLabel>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", marginBottom: editing ? 10 : 28 }}>
            {ev.inventory.length === 0 && <div style={{ padding: 16, fontSize: 13.5, color: C.inkSoft }}>Nothing tracked yet.</div>}
            {ev.inventory.map((i, idx) => {
              const short = Number(i.have) < Number(i.need);
              return (
                <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: idx ? `1px solid ${C.line}` : "none", flexWrap: "wrap" }}>
                  {editing ? (
                    <>
                      <input style={{ ...inputStyle, flex: "2 1 140px" }} value={i.item}
                        onChange={(e) => onUpdate((x) => ({ inventory: x.inventory.map((y) => (y.id === i.id ? { ...y, item: e.target.value } : y)) }))} />
                      <label style={{ fontSize: 12, color: C.inkSoft }}>Have
                        <input type="number" style={{ ...inputStyle, width: 76, marginLeft: 6 }} value={i.have}
                          onChange={(e) => onUpdate((x) => ({ inventory: x.inventory.map((y) => (y.id === i.id ? { ...y, have: Number(e.target.value) } : y)) }))} />
                      </label>
                      <label style={{ fontSize: 12, color: C.inkSoft }}>Need
                        <input type="number" style={{ ...inputStyle, width: 76, marginLeft: 6 }} value={i.need}
                          onChange={(e) => onUpdate((x) => ({ inventory: x.inventory.map((y) => (y.id === i.id ? { ...y, need: Number(e.target.value) } : y)) }))} />
                      </label>
                      <button onClick={() => onUpdate((x) => ({ inventory: x.inventory.filter((y) => y.id !== i.id) }))}
                        aria-label="Remove item" style={removeBtn}>×</button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 14, flex: 1 }}>{i.item}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: short ? C.danger : C.pine }}>
                        {i.have} on hand · {i.need} needed {short ? "· short" : "✓"}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {editing && (
            <button onClick={() => onUpdate((x) => ({ inventory: [...x.inventory, { id: uid(), item: "New item", have: 0, need: 0 }] }))}
              style={{ ...btnGhost, marginBottom: 28 }}>
              + Add an item
            </button>
          )}
        </>
      )}

      {/* Progress report */}
      {isAdmin && (
        <>
          <SectionLabel>Progress report</SectionLabel>
          {ev.report ? (
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 28 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
                <Field label="Attendance">
                  <input type="number" style={inputStyle} value={ev.report.attendance}
                    onChange={(e) => onUpdate((x) => ({ report: { ...x.report, attendance: Number(e.target.value) } }))} />
                </Field>
                <Field label="New visitors">
                  <input type="number" style={inputStyle} value={ev.report.newVisitors}
                    onChange={(e) => onUpdate((x) => ({ report: { ...x.report, newVisitors: Number(e.target.value) } }))} />
                </Field>
              </div>
              <Field label="How it went">
                <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={ev.report.highlights}
                  onChange={(e) => onUpdate((x) => ({ report: { ...x.report, highlights: e.target.value } }))} />
              </Field>
              <div style={{ height: 10 }} />
              <Field label="Follow-ups">
                <textarea style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} value={ev.report.followUps}
                  onChange={(e) => onUpdate((x) => ({ report: { ...x.report, followUps: e.target.value } }))} />
              </Field>
            </div>
          ) : (
            <button
              onClick={() => { onUpdate({ status: "past", report: { attendance: 0, newVisitors: 0, highlights: "", followUps: "" } }); ping("Report started — this activity is now marked as finished"); }}
              style={{ ...btnPrimary, marginBottom: 28 }}>
              File progress report (marks activity finished)
            </button>
          )}
        </>
      )}

      {/* Member sees a filed report read-only */}
      {!isAdmin && ev.report && (
        <>
          <SectionLabel>How it went</SectionLabel>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 28 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 14 }}>
              <MiniStat label="Attendance" value={ev.report.attendance} />
              <MiniStat label="New visitors" value={ev.report.newVisitors} />
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{ev.report.highlights}</p>
          </div>
        </>
      )}

      {/* Delete */}
      {editing && (
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 18 }}>
          {confirmDelete ? (
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: C.danger, fontWeight: 700 }}>Delete this activity for good?</span>
              <button onClick={onDelete} style={btnDanger}>Yes, delete</button>
              <button onClick={() => setConfirmDelete(false)} style={btnGhost}>Cancel</button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "none", color: C.danger, fontSize: 13, fontWeight: 700, padding: 0 }}>
              Delete this activity
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------- small components ------------------------ */

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.inkSoft, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
      {children}
      <span style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkSoft, marginBottom: 4 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Stat({ label, value, alert }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: alert ? C.danger : C.ink }}>{value}</div>
      <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ background: C.paper, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

const btnPrimary = {
  background: C.pine, color: "#fff", border: "none", borderRadius: 999,
  padding: "10px 18px", fontSize: 13, fontWeight: 700,
};
const btnGhost = {
  background: "#fff", color: C.pine, border: `1px solid ${C.line}`, borderRadius: 999,
  padding: "10px 18px", fontSize: 13, fontWeight: 700,
};
const btnDanger = {
  background: C.danger, color: "#fff", border: "none", borderRadius: 999,
  padding: "8px 16px", fontSize: 13, fontWeight: 700,
};
const removeBtn = {
  border: "none", background: C.paper, color: C.danger, borderRadius: 999,
  width: 28, height: 28, fontSize: 15, fontWeight: 700, flexShrink: 0,
};
