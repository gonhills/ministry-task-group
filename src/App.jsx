import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

/* ------------------------------------------------------------------ */
/*  Ministry Task Group — First UMC Ridgecrest                         */
/*  v4: Group pages with full editing, church-wide Inventory tab,      */
/*  and a Lead Hub (task tracker + message board for leads).           */
/*  Requires: run supabase/add-hub-inventory.sql once in Supabase.     */
/*  Supabase-backed data (everything saves & syncs live).              */
/*  Admin unlocks with the static code below — simple, but note it     */
/*  can be found by anyone who reads the app's source code, so don't   */
/*  keep sensitive personal info in the directory.                     */
/*  CHANGE YOUR ADMIN CODE HERE:                                       */
/* ------------------------------------------------------------------ */

const ADMIN_CODE = "OLIVE-5457";

/* Editable site text — defaults used until the settings table has values */
const DEFAULT_SETTINGS = {
  app_title: "Ministry Task Group",
  org_name: "First United Methodist Church · Ridgecrest",
  hero_text: "This week at First UMC — ways to gather, serve, and belong.",
};

const C = {
  paper: "#F6F3EA",
  card: "#FFFFFF",
  ink: "#232C27",
  inkSoft: "#5F6962",
  line: "#E8E2D4",
  pine: "#3D5A48",
  pineDark: "#243B2E",
  amber: "#C98A2D",
  amberSoft: "#F6E7C8",
  gold: "#DDA43E",
  danger: "#A64B3A",
  shadow: "0 1px 2px rgba(46,58,50,.05), 0 8px 24px rgba(46,58,50,.07)",
  shadowLift: "0 3px 6px rgba(46,58,50,.09), 0 18px 44px rgba(46,58,50,.16)",
};

const SWATCHES = ["#C98A2D", "#6F4E37", "#56789B", "#3D5A48", "#A64B3A", "#7C5CA8", "#B0713F", "#4E8A7E"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ICONS = ["✦", "☕", "❋", "✚", "♪", "❀", "✉", "☀"];

const uid = () => Math.random().toString(36).slice(2, 9);

const tint = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * 0.86);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
};

/* ----------------------------- helpers ----------------------------- */

const progressOf = (ev) =>
  ev.tasks.length ? Math.round((ev.tasks.filter((t) => t.done).length / ev.tasks.length) * 100) : 0;
const openTasks = (ev) => ev.tasks.filter((t) => !t.assignee && !t.done);

/* ---- database row mapping ---- */

const evToDb = (e) => ({
  id: e.id, team_id: e.teamId, title: e.title, day: e.day, date: e.date, time: e.time,
  location: e.location, status: e.status, goal: e.goal,
  instructions: e.instructions, tasks: e.tasks, inventory: e.inventory, report: e.report,
});
const evFromDb = (r) => ({
  id: r.id, teamId: r.team_id, title: r.title, day: r.day, date: r.date, time: r.time,
  location: r.location, status: r.status, goal: r.goal,
  instructions: r.instructions || [], tasks: r.tasks || [], inventory: r.inventory || [], report: r.report || null,
});
const teamToDb = (t) => ({ id: t.id, name: t.name, color: t.color, icon: t.icon, goal: t.goal, lead: t.lead, volunteers: t.volunteers });
const teamFromDb = (r) => ({ id: r.id, name: r.name, color: r.color, icon: r.icon, goal: r.goal, lead: r.lead, volunteers: r.volunteers || [] });
const personToDb = (p) => ({ id: p.id, name: p.name, phone: p.phone, email: p.email, notes: p.notes });
const personFromDb = (r) => ({ id: r.id, name: r.name, phone: r.phone || "", email: r.email || "", notes: r.notes || "" });
const annToDb = (a) => ({ id: a.id, title: a.title, body: a.body, date: a.date });
const annFromDb = (r) => ({ id: r.id, title: r.title, body: r.body || "", date: r.date || "" });
const invToDb = (i) => ({ id: i.id, item: i.item, category: i.category, have: Number(i.have) || 0, need: Number(i.need) || 0, unit: i.unit, location: i.location, notes: i.notes, team_id: i.teamId });
const invFromDb = (r) => ({ id: r.id, item: r.item || "", category: r.category || "General", have: r.have ?? 0, need: r.need ?? 0, unit: r.unit || "", location: r.location || "", notes: r.notes || "", teamId: r.team_id || null });
const ltToDb = (t) => ({ id: t.id, title: t.title, details: t.details, assignee: t.assignee, team_id: t.teamId, due: t.due, status: t.status });
const ltFromDb = (r) => ({ id: r.id, title: r.title || "", details: r.details || "", assignee: r.assignee || "", teamId: r.team_id || null, due: r.due || "", status: r.status || "todo", createdAt: r.created_at });
const msgToDb = (m) => ({ id: m.id, author: m.author, body: m.body, team_id: m.teamId });
const msgFromDb = (r) => ({ id: r.id, author: r.author || "", body: r.body || "", teamId: r.team_id || null, createdAt: r.created_at });

/* Lead-task statuses */
const LT_STATUS = {
  todo: { label: "To do", bg: "#F6E7C8", fg: "#7A5416", next: "doing" },
  doing: { label: "In progress", bg: "#E2EAF2", fg: "#3E5A78", next: "done" },
  done: { label: "Done", bg: "#E7EFE8", fg: "#3D5A48", next: "todo" },
};

/* "Jul 12"-style short date for sensible defaults */
const shortDate = (d = new Date()) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

/* ---- debounced saving (so typing doesn't fire a request per keystroke) ---- */

const saveTimers = {};
const pendingKeys = new Set();
const scheduleSave = (table, id, row) => {
  if (!supabase) return;
  const key = `${table}:${id}`;
  pendingKeys.add(key);
  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(async () => {
    await supabase.from(table).upsert(row);
    pendingKeys.delete(key);
  }, 700);
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
};


const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* fall through to legacy path */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
};

const inputStyle = {
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  padding: "9px 13px",
  fontSize: 13.5,
  background: "#fff",
  color: C.ink,
  fontFamily: "inherit",
  width: "100%",
  boxShadow: "inset 0 1px 2px rgba(35,44,39,.04)",
};

/* ------------------------------- app ------------------------------- */

export default function App() {
  const [asAdmin, setAsAdmin] = useState(false); // admins can preview member view
  const [tab, setTab] = useState("home"); // home | directory
  const [showGate, setShowGate] = useState(false);

  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [people, setPeople] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activity, setActivity] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [leadTasks, setLeadTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [needsDbUpgrade, setNeedsDbUpgrade] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  const [openEventId, setOpenEventId] = useState(null);
  const [openTeamId, setOpenTeamId] = useState(null);
  const [editingTeam, setEditingTeam] = useState(false);
  const [editingEvent, setEditingEvent] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [toast, setToast] = useState(null);

  const adminUnlockedReal = adminUnlocked;
  const isAdmin = adminUnlockedReal && asAdmin;
  const adminName = "Admin";

  const ping = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  /* ---- initial load + live sync ---- */
  const fetchAll = async () => {
    const [t, p, e, a, act, cfg, inv, lt, msg] = await Promise.all([
      supabase.from("teams").select("*").order("created_at"),
      supabase.from("people").select("*").order("name"),
      supabase.from("events").select("*").order("created_at"),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("activity").select("*").order("created_at", { ascending: false }).limit(15),
      supabase.from("settings").select("*"),
      supabase.from("inventory").select("*").order("created_at"),
      supabase.from("lead_tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setTeams((t.data || []).map(teamFromDb));
    setPeople((p.data || []).map(personFromDb));
    setEvents((e.data || []).map(evFromDb));
    setAnnouncements((a.data || []).map(annFromDb));
    setActivity(act.data || []);
    setInventory((inv.data || []).map(invFromDb));
    setLeadTasks((lt.data || []).map(ltFromDb));
    setMessages((msg.data || []).map(msgFromDb));
    // If the new tables don't exist yet, the queries above error with "relation does not exist".
    setNeedsDbUpgrade([inv, lt, msg].some((r) => r.error && (r.error.code === "42P01" || /does not exist/i.test(r.error.message || ""))));
    if (cfg.data && cfg.data.length) {
      const map = {};
      cfg.data.forEach((r) => { map[r.key] = r.value; });
      setSettings((prev) => ({ ...prev, ...map }));
    }
    setLoaded(true);
  };

  useEffect(() => {
    if (!supabase) return;
    fetchAll();
    const applyRemote = (setter, fromDb) => (payload) => {
      const key = `${payload.table}:${payload.eventType === "DELETE" ? payload.old.id : payload.new.id}`;
      if (pendingKeys.has(key)) return; // our own edit is mid-flight; don't clobber typing
      setter((rows) => {
        if (payload.eventType === "DELETE") return rows.filter((r) => r.id !== payload.old.id);
        const row = fromDb(payload.new);
        return rows.some((r) => r.id === row.id) ? rows.map((r) => (r.id === row.id ? row : r)) : [...rows, row];
      });
    };
    const ch = supabase
      .channel("mtg-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, applyRemote(setTeams, teamFromDb))
      .on("postgres_changes", { event: "*", schema: "public", table: "people" }, applyRemote(setPeople, personFromDb))
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, applyRemote(setEvents, evFromDb))
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, applyRemote(setAnnouncements, annFromDb))
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, applyRemote(setInventory, invFromDb))
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_tasks" }, applyRemote(setLeadTasks, ltFromDb))
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, applyRemote(setMessages, msgFromDb))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity" }, (payload) =>
        setActivity((rows) => [payload.new, ...rows].slice(0, 15))
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, (payload) => {
        if (payload.eventType === "DELETE") return;
        if (pendingKeys.has(`settings:${payload.new.key}`)) return;
        setSettings((prev) => ({ ...prev, [payload.new.key]: payload.new.value }));
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const teamById = (id) => teams.find((t) => t.id === id);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    scheduleSave("settings", key, { key, value });
  };

  const logActivity = (what, teamId = null, who = adminName) => {
    const row = { id: uid() + uid(), who: who || adminName, what, team_id: teamId };
    setActivity((rows) => [{ ...row, created_at: new Date().toISOString() }, ...rows].slice(0, 15));
    if (supabase) supabase.from("activity").insert(row).then(() => {});
  };

  /* ---- events ---- */
  const updateEvent = (id, patch) =>
    setEvents((evs) =>
      evs.map((e) => {
        if (e.id !== id) return e;
        const next = { ...e, ...(typeof patch === "function" ? patch(e) : patch) };
        scheduleSave("events", next.id, evToDb(next));
        return next;
      })
    );

  const deleteEvent = (id) => {
    setEvents((evs) => evs.filter((e) => e.id !== id));
    if (supabase) supabase.from("events").delete().eq("id", id).then(() => {});
    setOpenEventId(null);
    setEditingEvent(false);
    ping("Activity deleted");
  };

  const addEvent = (teamId = null) => {
    if (!teams.length) { ping("Create a small group first"); return; }
    const ev = {
      id: uid(), teamId: teamId || teams[0].id, title: "New activity",
      day: DAYS[new Date().getDay()], date: shortDate(),
      time: "10:00 AM", location: "Fellowship Hall", status: "upcoming", goal: "",
      instructions: [], tasks: [], inventory: [], report: null,
    };
    setEvents((evs) => [...evs, ev]);
    if (supabase) supabase.from("events").insert(evToDb(ev)).then(() => {});
    setOpenTeamId(null);
    setOpenEventId(ev.id);
    setEditingEvent(true);
    ping("New activity created — fill in the details");
  };

  /* ---- teams ---- */
  const updateTeam = (id, patch) =>
    setTeams((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...(typeof patch === "function" ? patch(t) : patch) };
        scheduleSave("teams", next.id, teamToDb(next));
        return next;
      })
    );

  const addTeam = () => {
    const t = {
      id: uid(), name: "New small group", color: SWATCHES[teams.length % SWATCHES.length],
      icon: ICONS[teams.length % ICONS.length], goal: "", lead: "", volunteers: [],
    };
    setTeams((ts) => [...ts, t]);
    if (supabase) supabase.from("teams").insert(teamToDb(t)).then(() => {});
    setTab("groups");
    setOpenEventId(null);
    setOpenTeamId(t.id);
    setEditingTeam(true);
    ping("New group created — fill in the details");
  };

  const deleteTeam = (id) => {
    if (events.some((e) => e.teamId === id)) {
      ping("Delete or reassign this group's activities first");
      return;
    }
    setTeams((ts) => ts.filter((t) => t.id !== id));
    if (supabase) supabase.from("teams").delete().eq("id", id).then(() => {});
    setOpenTeamId(null);
    setEditingTeam(false);
    ping("Group removed");
  };

  /* ---- church-wide inventory ---- */
  const addInvItem = (teamId = null) => {
    const i = { id: uid(), item: "", category: "General", have: 0, need: 0, unit: "", location: "", notes: "", teamId };
    setInventory((xs) => [...xs, i]);
    if (supabase) supabase.from("inventory").insert(invToDb(i)).then(() => {});
    ping("Item added — fill in the details");
  };
  const updateInvItem = (id, patch) =>
    setInventory((xs) =>
      xs.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, ...(typeof patch === "function" ? patch(i) : patch) };
        scheduleSave("inventory", next.id, invToDb(next));
        return next;
      })
    );
  const removeInvItem = (id) => {
    setInventory((xs) => xs.filter((i) => i.id !== id));
    if (supabase) supabase.from("inventory").delete().eq("id", id).then(() => {});
    ping("Item removed");
  };

  /* ---- lead task tracker ---- */
  const addLeadTask = (teamId = null) => {
    const t = { id: uid(), title: "", details: "", assignee: "", teamId, due: "", status: "todo", createdAt: new Date().toISOString() };
    setLeadTasks((xs) => [t, ...xs]);
    if (supabase) supabase.from("lead_tasks").insert(ltToDb(t)).then(() => {});
    ping("Task added — give it a title and an owner");
  };
  const updateLeadTask = (id, patch) =>
    setLeadTasks((xs) =>
      xs.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...(typeof patch === "function" ? patch(t) : patch) };
        scheduleSave("lead_tasks", next.id, ltToDb(next));
        return next;
      })
    );
  const removeLeadTask = (id) => {
    setLeadTasks((xs) => xs.filter((t) => t.id !== id));
    if (supabase) supabase.from("lead_tasks").delete().eq("id", id).then(() => {});
    ping("Task removed");
  };

  /* ---- lead message board ---- */
  const postMessage = (author, body, teamId = null) => {
    const m = { id: uid(), author, body, teamId, createdAt: new Date().toISOString() };
    setMessages((xs) => [m, ...xs]);
    if (supabase) supabase.from("messages").insert(msgToDb(m)).then(() => {});
    logActivity(`posted an update on the Lead hub`, teamId, author);
  };
  const removeMessage = (id) => {
    setMessages((xs) => xs.filter((m) => m.id !== id));
    if (supabase) supabase.from("messages").delete().eq("id", id).then(() => {});
  };

  /* ---- people ---- */
  const addPerson = () => {
    const p = { id: uid(), name: "New person", phone: "", email: "", notes: "" };
    setPeople((ps) => [p, ...ps]);
    if (supabase) supabase.from("people").insert(personToDb(p)).then(() => {});
    ping("Person added — fill in their details");
  };

  const updatePerson = (id, patch) =>
    setPeople((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch };
        scheduleSave("people", next.id, personToDb(next));
        return next;
      })
    );

  const renamePerson = (id, newName) => {
    const person = people.find((p) => p.id === id);
    if (!person) return;
    const oldName = person.name;
    updatePerson(id, { name: newName });
    setTeams((ts) =>
      ts.map((t) => {
        if (t.lead !== oldName && !t.volunteers.includes(oldName)) return t;
        const next = {
          ...t,
          lead: t.lead === oldName ? newName : t.lead,
          volunteers: t.volunteers.map((v) => (v === oldName ? newName : v)),
        };
        scheduleSave("teams", next.id, teamToDb(next));
        return next;
      })
    );
    setEvents((evs) =>
      evs.map((e) => {
        if (!e.tasks.some((task) => task.assignee === oldName)) return e;
        const next = { ...e, tasks: e.tasks.map((task) => (task.assignee === oldName ? { ...task, assignee: newName } : task)) };
        scheduleSave("events", next.id, evToDb(next));
        return next;
      })
    );
  };

  const removePerson = (id) => {
    const person = people.find((p) => p.id === id);
    if (!person) return;
    setPeople((ps) => ps.filter((p) => p.id !== id));
    if (supabase) supabase.from("people").delete().eq("id", id).then(() => {});
    setTeams((ts) =>
      ts.map((t) => {
        if (t.lead !== person.name && !t.volunteers.includes(person.name)) return t;
        const next = { ...t, lead: t.lead === person.name ? "" : t.lead, volunteers: t.volunteers.filter((v) => v !== person.name) };
        scheduleSave("teams", next.id, teamToDb(next));
        return next;
      })
    );
    setEvents((evs) =>
      evs.map((e) => {
        if (!e.tasks.some((task) => task.assignee === person.name)) return e;
        const next = { ...e, tasks: e.tasks.map((task) => (task.assignee === person.name ? { ...task, assignee: null } : task)) };
        scheduleSave("events", next.id, evToDb(next));
        return next;
      })
    );
    ping(`${person.name} removed from the directory`);
  };

  const toggleMembership = (personName, teamId) => {
    updateTeam(teamId, (t) => ({
      volunteers: t.volunteers.includes(personName)
        ? t.volunteers.filter((v) => v !== personName)
        : [...t.volunteers, personName],
    }));
  };

  /* ---- announcements ---- */
  const addAnnouncement = () => {
    const a = { id: uid(), title: "New announcement", body: "", date: "Today" };
    setAnnouncements((as) => [a, ...as]);
    if (supabase) supabase.from("announcements").insert(annToDb(a)).then(() => {});
    ping("Announcement added");
  };
  const updateAnnouncement = (id, patch) =>
    setAnnouncements((as) =>
      as.map((a) => {
        if (a.id !== id) return a;
        const next = { ...a, ...patch };
        scheduleSave("announcements", next.id, annToDb(next));
        return next;
      })
    );
  const removeAnnouncement = (id) => {
    setAnnouncements((as) => as.filter((a) => a.id !== id));
    if (supabase) supabase.from("announcements").delete().eq("id", id).then(() => {});
  };

  /* ---- member signup (goes through the safe claim_task function) ---- */
  const signup = async (eventId, taskId, name) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    // optimistic local update so it feels instant
    setEvents((evs) =>
      evs.map((e) =>
        e.id !== eventId ? e : { ...e, tasks: e.tasks.map((t) => (t.id === taskId ? { ...t, assignee: name } : t)) }
      )
    );
    const team = teamById(ev.teamId);
    if (team && !team.volunteers.includes(name)) {
      setTeams((ts) => ts.map((t) => (t.id === team.id ? { ...t, volunteers: [...t.volunteers, name] } : t)));
    }
    if (supabase) {
      const { error } = await supabase.rpc("claim_task", { p_event_id: eventId, p_task_id: taskId, p_name: name });
      if (error) {
        ping("Couldn't save your signup — please try again");
        return;
      }
    }
    ping(`Thanks, ${name} — you're on it`);
  };

  const openEvent = events.find((e) => e.id === openEventId) || null;

  const lock = () => {
    setAdminUnlocked(false);
    setAsAdmin(false);
    setOpenEventId(null);
    setEditingEvent(false);
    setOpenTeamId(null);
    setEditingTeam(false);
    setTab("home");
    ping("Locked — back to member view");
  };

  /* ---- setup / loading screens ---- */
  if (!supabase) {
    return (
      <SetupNotice />
    );
  }
  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Public Sans', system-ui, sans-serif", color: C.inkSoft }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&display=swap');
        @keyframes softPulse { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }`}</style>
        <div style={{ textAlign: "center" }}>
          <div aria-hidden="true" style={{ width: 26, height: 34, margin: "0 auto 14px", borderRadius: "999px 999px 5px 5px", background: `linear-gradient(180deg, ${C.gold}, ${C.amber})`, animation: "softPulse 1.6s ease-in-out infinite" }} />
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, color: C.ink, marginBottom: 8 }}>Ministry Task Group</div>
          <div style={{ fontSize: 13.5 }}>Gathering this week's plans…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(1100px 480px at 88% -120px, rgba(201,138,45,.08), transparent 62%), radial-gradient(900px 620px at -8% 112%, rgba(61,90,72,.07), transparent 60%), ${C.paper}`,
      color: C.ink, fontFamily: "'Public Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=Public+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        ::selection { background: ${C.amberSoft}; }
        button { font-family: inherit; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease, filter .15s ease, background .15s ease; }
        button:not(:disabled):hover { filter: brightness(1.05); }
        button:active { transform: scale(.98); }
        select, input, textarea { font-family: inherit; transition: border-color .15s ease, box-shadow .15s ease; }
        input:hover, textarea:hover, select:hover { border-color: #CFC7B4 !important; }
        input:focus, textarea:focus, select:focus { border-color: ${C.amber} !important; box-shadow: 0 0 0 3px rgba(201,138,45,.14), inset 0 1px 2px rgba(35,44,39,.04) !important; outline: none; }
        .arch { border-radius: 999px 999px 18px 18px; }
        .card-hover { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: ${C.shadowLift} !important; border-color: #D8D0BE !important; }
        .lift:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(35,44,39,.14); }
        .tab { position: relative; }
        .tab:hover { background: rgba(255,255,255,.16) !important; }
        .tab-active::after { content: ""; position: absolute; top: 0; left: 14px; right: 14px; height: 3px; border-radius: 0 0 3px 3px; background: linear-gradient(90deg, ${C.gold}, ${C.amber}); }
        @media (prefers-reduced-motion: reduce) {
          button, .card-hover, .card-hover:hover, .lift:hover { transition: none !important; transform: none !important; }
        }
        button:focus-visible, select:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid ${C.amber}; outline-offset: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes softPulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
        main > div { animation: fadeUp .3s ease both; }
        @media (prefers-reduced-motion: reduce) { main > div { animation: none; } }
      `}</style>

      {/* Header */}
      <header style={{
        background: `linear-gradient(165deg, #1C2F24 0%, #2C4736 55%, #33513F 100%)`,
        color: "#F4F1E6",
        padding: "24px 20px 0",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* faint chapel-arch pattern */}
        <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.07, pointerEvents: "none" }}>
          <defs>
            <pattern id="arches" width="56" height="72" patternUnits="userSpaceOnUse">
              <path d="M8 72 V36 a20 20 0 0 1 40 0 V72" fill="none" stroke="#F4F1E6" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#arches)" />
        </svg>
        {/* light through the window */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(640px 300px at 18% -40px, rgba(221,164,62,.22), transparent 68%), radial-gradient(500px 240px at 92% 120%, rgba(244,241,230,.06), transparent 70%)" }} />
        <div style={{ maxWidth: 960, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(244,241,230,.7)" }}>
                <span aria-hidden="true" style={{ width: 26, height: 1, background: `linear-gradient(90deg, transparent, ${C.gold})` }} />
                {settings.org_name}
              </div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "clamp(27px, 5vw, 36px)", letterSpacing: "-0.015em", margin: "8px 0 16px", textShadow: "0 2px 28px rgba(0,0,0,.3)" }}>
                {settings.app_title}
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {adminUnlockedReal ? (
                <>
                  <div style={{ display: "flex", background: "rgba(255,255,255,.12)", borderRadius: 999, padding: 4 }}>
                    {[["member", "Member"], ["admin", "Admin"]].map(([v, label]) => (
                      <button key={v}
                        onClick={() => { setAsAdmin(v === "admin"); setEditingEvent(false); }}
                        style={{
                          border: "none", borderRadius: 999, padding: "7px 16px", fontSize: 13, fontWeight: 600,
                          background: (v === "admin") === asAdmin ? "#F4F1E6" : "transparent",
                          color: (v === "admin") === asAdmin ? C.pineDark : "#F4F1E6",
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={lock} style={{ background: "none", border: "1px solid rgba(255,255,255,.35)", color: "#F4F1E6", borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 600 }}>
                    Sign out
                  </button>
                </>
              ) : (
                <button onClick={() => setShowGate(true)}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,.35)", color: "#F4F1E6", borderRadius: 999, padding: "8px 16px", fontSize: 13, fontWeight: 600 }}>
                  🔒 Admin access
                </button>
              )}
            </div>
          </div>

          {/* Nav tabs */}
          <nav style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {[
              ["home", "This week"],
              ["groups", "Groups"],
              ["inventory", "Inventory"],
              ["directory", "Directory"],
              ...(adminUnlockedReal ? [["hub", "Lead hub"]] : []),
            ].map(([id, label]) => (
              <button key={id}
                className={`tab${tab === id ? " tab-active" : ""}`}
                onClick={() => { setTab(id); setOpenEventId(null); setEditingEvent(false); setOpenTeamId(null); setEditingTeam(false); }}
                style={{
                  border: "none",
                  background: tab === id ? C.paper : "rgba(255,255,255,.08)",
                  color: tab === id ? C.pineDark : "rgba(244,241,230,.9)",
                  borderRadius: "12px 12px 0 0",
                  padding: tab === id ? "12px 22px" : "10px 20px",
                  fontSize: 13.5,
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                  filter: "none",
                }}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 48px" }}>
        {openEvent ? (
          <EventDetail
            ev={openEvent}
            team={teamById(openEvent.teamId)}
            teams={teams}
            isAdmin={isAdmin}
            editing={isAdmin && editingEvent}
            setEditing={setEditingEvent}
            onBack={() => { setOpenEventId(null); setEditingEvent(false); }}
            onUpdate={(patch) => updateEvent(openEvent.id, patch)}
            onDelete={() => deleteEvent(openEvent.id)}
            onSignup={(taskId, name) => signup(openEvent.id, taskId, name)}
            onLog={(what) => logActivity(what, openEvent.teamId)}
            ping={ping}
          />
        ) : openTeamId && teamById(openTeamId) ? (
          <GroupDetail
            team={teamById(openTeamId)}
            events={events}
            leadTasks={leadTasks}
            isAdmin={isAdmin}
            editing={isAdmin && editingTeam}
            setEditing={setEditingTeam}
            onBack={() => { setOpenTeamId(null); setEditingTeam(false); }}
            onUpdate={(patch) => updateTeam(openTeamId, patch)}
            onDelete={() => deleteTeam(openTeamId)}
            onOpenEvent={(id) => { setOpenEventId(id); setEditingEvent(false); }}
            onNewEvent={() => addEvent(openTeamId)}
            ping={ping}
          />
        ) : tab === "groups" ? (
          <GroupsView
            teams={teams}
            events={events}
            isAdmin={isAdmin}
            onOpenTeam={(id) => { setOpenTeamId(id); setEditingTeam(false); }}
            onNewTeam={addTeam}
          />
        ) : tab === "inventory" ? (
          <InventoryView
            inventory={inventory}
            teams={teams}
            events={events}
            isAdmin={isAdmin}
            needsDbUpgrade={needsDbUpgrade}
            onAdd={addInvItem}
            onUpdate={updateInvItem}
            onRemove={removeInvItem}
            onOpenEvent={(id) => { setOpenEventId(id); setEditingEvent(false); }}
            ping={ping}
          />
        ) : tab === "hub" && adminUnlockedReal ? (
          <TeamHubView
            leadTasks={leadTasks}
            messages={messages}
            teams={teams}
            people={people}
            needsDbUpgrade={needsDbUpgrade}
            onAddTask={addLeadTask}
            onUpdateTask={updateLeadTask}
            onRemoveTask={removeLeadTask}
            onPost={postMessage}
            onRemoveMessage={removeMessage}
            onLog={logActivity}
            ping={ping}
          />
        ) : tab === "directory" ? (
          <DirectoryView
            people={people}
            teams={teams}
            isAdmin={isAdmin}
            onAdd={addPerson}
            onRename={renamePerson}
            onUpdate={updatePerson}
            onRemove={removePerson}
            onToggleMembership={toggleMembership}
          />
        ) : isAdmin ? (
          <AdminHome
            teams={teams}
            events={events}
            announcements={announcements}
            activity={activity}
            inventory={inventory}
            leadTasks={leadTasks}
            showTeams={showTeams}
            setShowTeams={setShowTeams}
            onOpen={(id) => { setOpenEventId(id); setEditingEvent(false); }}
            onNewEvent={() => addEvent()}
            onNewTeam={addTeam}
            onGoto={(id) => { setTab(id); setOpenEventId(null); setOpenTeamId(null); }}
            settings={settings}
            onUpdateSetting={updateSetting}
            onAddAnnouncement={addAnnouncement}
            onUpdateAnnouncement={updateAnnouncement}
            onRemoveAnnouncement={removeAnnouncement}
            ping={ping}
          />
        ) : (
          <MemberHome teams={teams} events={events} announcements={announcements} heroText={settings.hero_text}
            onOpen={setOpenEventId} onOpenTeam={(id) => { setOpenTeamId(id); setEditingTeam(false); }} />
        )}
      </main>

      <footer style={{ textAlign: "center", padding: "10px 20px 44px", color: C.inkSoft }}>
        <div aria-hidden="true" style={{ width: 13, height: 17, margin: "0 auto 12px", borderRadius: "999px 999px 3px 3px", background: `linear-gradient(180deg, ${C.gold}, ${C.amber})`, opacity: 0.9 }} />
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 14.5, color: "#4A554E" }}>
          “Serve one another humbly in love.”
        </div>
        <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 6, fontWeight: 600 }}>
          Galatians 5:13 · {settings.org_name}
        </div>
      </footer>

      {showGate && (
        <LoginGate
          onUnlock={() => { setAdminUnlocked(true); setAsAdmin(true); setShowGate(false); ping("Admin unlocked"); }}
          onClose={() => setShowGate(false)}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: `linear-gradient(180deg, #2E4A39, ${C.pineDark})`, color: "#F4F1E6", padding: "11px 22px", borderRadius: 999,
          fontSize: 13, fontWeight: 600, zIndex: 60,
          boxShadow: "0 10px 28px rgba(0,0,0,.3), inset 0 0 0 1px rgba(221,164,62,.4)",
          maxWidth: "90vw", textAlign: "center", animation: "fadeUp .25s ease both",
        }}>
          <span aria-hidden="true" style={{ color: C.gold, marginRight: 8 }}>✦</span>{toast}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- login gate -------------------------- */

function LoginGate({ onUnlock, onClose }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);

  const submit = () => {
    if (code.trim() === ADMIN_CODE) {
      onUnlock();
    } else {
      setError("That code isn't right — try again.");
      setCode("");
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(35,44,39,.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: C.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 380, textAlign: "center", boxShadow: `${C.shadowLift}, inset 0 0 0 1px rgba(255,255,255,.7)`, animation: "fadeUp .25s ease both", borderTop: `3px solid ${C.amber}` }}>
        <div style={{ width: 46, height: 56, margin: "0 auto", borderRadius: "999px 999px 9px 9px", background: `linear-gradient(180deg, ${C.amberSoft}, #fff)`, border: `1px solid #E9D3A4`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🔒</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 600, margin: "10px 0 6px" }}>Admin access</h2>
        <p style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6, margin: "0 0 16px" }}>
          Enter the admin code from the church office to manage groups, activities, and the directory.
        </p>
        <input
          autoFocus
          type="password"
          autoComplete="current-password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Admin code"
          aria-label="Admin code"
          style={{ ...inputStyle, textAlign: "center", fontSize: 16, letterSpacing: "0.12em", marginBottom: 12 }}
        />
        {error && (
          <p style={{ fontSize: 12.5, color: C.danger, fontWeight: 600, margin: "0 0 12px" }}>{error}</p>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={submit} style={btnPrimary}>Unlock</button>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- setup notice ------------------------- */

function SetupNotice() {
  return (
    <div style={{ minHeight: "100vh", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Public Sans', system-ui, sans-serif", padding: 20 }}>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, boxShadow: C.shadow, maxWidth: 520, padding: 28 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, margin: "0 0 10px", color: C.ink }}>Almost there — connect your database</h1>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: C.inkSoft, margin: "0 0 10px" }}>
          This app needs two settings before it can load: <strong style={{ color: C.ink }}>VITE_SUPABASE_URL</strong> and{" "}
          <strong style={{ color: C.ink }}>VITE_SUPABASE_ANON_KEY</strong>.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: C.inkSoft, margin: 0 }}>
          Find both in your Supabase project under Settings → API, then add them to a <strong style={{ color: C.ink }}>.env</strong> file
          locally, or under Settings → Environment Variables in Vercel (then redeploy). The README has the full walkthrough.
        </p>
      </div>
    </div>
  );
}

/* --------------------------- announcements ------------------------- */

function Announcements({ items, editable, onAdd, onUpdate, onRemove }) {
  if (!editable && items.length === 0) return null;
  return (
    <>
      <SectionLabel>Announcements</SectionLabel>
      <div style={{ display: "grid", gap: 10, marginBottom: 36 }}>
        {items.map((a) => (
          <div key={a.id} style={{ background: `linear-gradient(180deg, #F9EDD2, ${C.amberSoft})`, border: `1px solid #E9D3A4`, borderLeft: `4px solid ${C.amber}`, borderRadius: 14, padding: "14px 18px", boxShadow: `${C.shadow}, inset 0 1px 0 rgba(255,255,255,.65)` }}>
            {editable ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...inputStyle, fontWeight: 700 }} value={a.title}
                    onChange={(e) => onUpdate(a.id, { title: e.target.value })} placeholder="Announcement title" />
                  <input style={{ ...inputStyle, width: 90 }} value={a.date}
                    onChange={(e) => onUpdate(a.id, { date: e.target.value })} placeholder="Date" />
                </div>
                <textarea style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} value={a.body}
                  onChange={(e) => onUpdate(a.id, { body: e.target.value })} placeholder="What does the congregation need to know?" />
                <div>
                  <button onClick={() => onRemove(a.id)}
                    style={{ background: "none", border: "none", color: C.danger, fontSize: 12.5, fontWeight: 700, padding: 0 }}>
                    Remove announcement
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#5C440F" }}>{a.title}</span>
                  <span style={{ fontSize: 12, color: "#8A6A2B", fontWeight: 600 }}>{a.date}</span>
                </div>
                {a.body && <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#5C440F", margin: "6px 0 0" }}>{a.body}</p>}
              </>
            )}
          </div>
        ))}
        {editable && (
          <button onClick={onAdd} style={{ ...btnGhost, justifySelf: "start" }}>+ Add announcement</button>
        )}
      </div>
    </>
  );
}

/* ---------------------------- member view -------------------------- */

function MemberHome({ teams, events, announcements, heroText, onOpen, onOpenTeam }) {
  const week = events.filter((e) => e.status === "upcoming");
  return (
    <div>
      <p style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 500, fontSize: "clamp(22px, 3.6vw, 28px)", lineHeight: 1.4, letterSpacing: "-0.005em", maxWidth: 660, margin: "10px 0 32px", color: "#31403A" }}>
        {heroText}
      </p>

      <Announcements items={announcements} editable={false} />

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
            <button key={ev.id} onClick={() => onOpen(ev.id)} className="arch card-hover"
              style={{ textAlign: "left", border: `1px solid ${C.line}`, background: C.card, padding: "38px 20px 20px", position: "relative", overflow: "hidden", boxShadow: `${C.shadow}, inset 0 0 0 1px rgba(255,255,255,.7)` }}>
              <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 74, background: `linear-gradient(180deg, ${tint(team.color)}, rgba(255,255,255,0))`, opacity: 0.9 }} />
              <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${team.color}, ${team.color}99)` }} />
              <span aria-hidden="true" style={{ position: "absolute", top: 14, right: 14, fontSize: 42, color: team.color, opacity: 0.14, transform: "rotate(-6deg)", pointerEvents: "none" }}>{team.icon}</span>
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: team.color }}>{team.name}</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: "6px 0 8px" }}>{ev.title}</div>
                <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6 }}>
                  {ev.day}, {ev.date} · {ev.time}
                  <br />
                  {ev.location}
                </div>
                {open > 0 && (
                  <div style={{ marginTop: 12, display: "inline-block", background: C.amberSoft, color: "#7A5416", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, boxShadow: "inset 0 0 0 1px rgba(201,138,45,.25)" }}>
                    {open} volunteer spot{open > 1 ? "s" : ""} open
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <SectionLabel>Our small groups</SectionLabel>
      <div style={{ display: "grid", gap: 14 }}>
        {teams.map((team) => (
          <button key={team.id} onClick={() => onOpenTeam && onOpenTeam(team.id)} className="card-hover"
            style={{ textAlign: "left", background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 16, padding: 20, display: "flex", gap: 16, alignItems: "flex-start" }}>
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
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- directory ---------------------------- */

function DirectoryView({ people, teams, isAdmin, onAdd, onRename, onUpdate, onRemove, onToggleMembership }) {
  const [q, setQ] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const teamsOf = (name) =>
    teams.filter((t) => t.volunteers.includes(name) || t.lead === name);

  const filtered = [...people]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((p) => {
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return (
        p.name.toLowerCase().includes(needle) ||
        teamsOf(p.name).some((t) => t.name.toLowerCase().includes(needle))
      );
    });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: "4px 0 4px" }}>Directory</h2>
          <p style={{ fontSize: 13, color: C.inkSoft, margin: 0 }}>
            {isAdmin
              ? `${people.length} people · contact details visible in admin`
              : `${people.length} people serving across our small groups`}
          </p>
        </div>
        {isAdmin && <button onClick={onAdd} style={btnPrimary}>+ Add person</button>}
      </div>

      <input
        style={{ ...inputStyle, marginBottom: 20, maxWidth: 420 }}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or group…"
        aria-label="Search the directory"
      />

      {!isAdmin && (
        <p style={{ fontSize: 12.5, color: C.inkSoft, margin: "0 0 16px" }}>
          Contact details are kept private. Reach the church office to get connected with anyone here.
        </p>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{ background: C.card, border: `1px dashed ${C.line}`, borderRadius: 14, padding: 20, fontSize: 13.5, color: C.inkSoft }}>
            No one matches that search.
          </div>
        )}
        {filtered.map((p) => {
          const memberships = teamsOf(p.name);
          const isLead = teams.some((t) => t.lead === p.name);
          return (
            <div key={p.id} style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 220px" }}>
                  {isAdmin ? (
                    <input style={{ ...inputStyle, fontWeight: 700, marginBottom: 8 }} value={p.name}
                      onChange={(e) => onRename(p.id, e.target.value)} aria-label="Name" />
                  ) : (
                    <div style={{ fontSize: 15.5, fontWeight: 700 }}>
                      {p.name}{" "}
                      {isLead && (
                        <span style={{ fontSize: 11, fontWeight: 700, background: "#E7EFE8", color: C.pine, borderRadius: 999, padding: "3px 10px", marginLeft: 6, verticalAlign: "middle" }}>
                          Group lead
                        </span>
                      )}
                    </div>
                  )}

                  {/* Team chips */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {(isAdmin ? teams : memberships).map((t) => {
                      const active = t.volunteers.includes(p.name) || t.lead === p.name;
                      return isAdmin ? (
                        <button key={t.id} onClick={() => onToggleMembership(p.name, t.id)}
                          title={t.lead === p.name ? "Group lead (change lead in Groups & people)" : active ? "Remove from group" : "Add to group"}
                          style={{
                            border: `1px solid ${active ? t.color : C.line}`,
                            background: active ? tint(t.color) : "transparent",
                            color: active ? t.color : C.inkSoft,
                            borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700,
                          }}>
                          {t.name}
                        </button>
                      ) : (
                        <span key={t.id} style={{ border: `1px solid ${t.color}`, background: tint(t.color), color: t.color, borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                          {t.name}
                        </span>
                      );
                    })}
                    {!isAdmin && memberships.length === 0 && (
                      <span style={{ fontSize: 12.5, color: C.inkSoft }}>Not in a group yet</span>
                    )}
                  </div>
                </div>

                {/* Contact — admin only */}
                {isAdmin && (
                  <div style={{ flex: "1 1 220px", display: "grid", gap: 8 }}>
                    <Field label="Phone">
                      <input style={inputStyle} value={p.phone} onChange={(e) => onUpdate(p.id, { phone: e.target.value })} placeholder="(760) 555-0100" />
                    </Field>
                    <Field label="Email">
                      <input style={inputStyle} value={p.email} onChange={(e) => onUpdate(p.id, { email: e.target.value })} placeholder="name@example.com" />
                    </Field>
                    <Field label="Notes">
                      <input style={inputStyle} value={p.notes} onChange={(e) => onUpdate(p.id, { notes: e.target.value })} placeholder="Availability, skills, ride needs…" />
                    </Field>
                    <div>
                      {confirmId === p.id ? (
                        <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12.5, color: C.danger, fontWeight: 700 }}>Remove {p.name}?</span>
                          <button onClick={() => { onRemove(p.id); setConfirmId(null); }} style={{ ...btnDanger, padding: "6px 14px" }}>Yes, remove</button>
                          <button onClick={() => setConfirmId(null)} style={{ ...btnGhost, padding: "6px 14px" }}>Cancel</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmId(p.id)}
                          style={{ background: "none", border: "none", color: C.danger, fontSize: 12.5, fontWeight: 700, padding: 0 }}>
                          Remove from directory
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------- admin view --------------------------- */

function AdminHome({ teams, events, announcements, activity, inventory, leadTasks, settings, onUpdateSetting, showTeams, setShowTeams, onOpen, onNewEvent, onNewTeam, onGoto, onAddAnnouncement, onUpdateAnnouncement, onRemoveAnnouncement, ping }) {
  const upcoming = events.filter((e) => e.status === "upcoming");
  const past = events.filter((e) => e.status === "past");
  const allTasks = upcoming.flatMap((e) => e.tasks);
  const unassigned = allTasks.filter((t) => !t.assignee && !t.done).length;
  const doneCount = allTasks.filter((t) => t.done).length;
  const lowStock = upcoming.flatMap((e) =>
    e.inventory.filter((i) => Number(i.have) < Number(i.need)).map((i) => ({ ...i, event: e.title, date: e.date, eventId: e.id }))
  );
  const lowCentral = inventory.filter((i) => Number(i.have) < Number(i.need));
  const openLeadTasks = leadTasks.filter((t) => t.status !== "done").length;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        <button onClick={onNewEvent} style={btnPrimary}>+ New activity</button>
        <button onClick={onNewTeam} style={btnGhost}>+ New small group</button>
        <button onClick={() => setShowTeams(!showTeams)} style={btnGhost}>
          {showTeams ? "Hide site settings" : "Site settings"}
        </button>
      </div>

      {showTeams && (
        <>
          <SectionLabel>Site text</SectionLabel>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 16, padding: 20, display: "grid", gap: 10, marginBottom: 24 }}>
            <Field label="App title (header)">
              <input style={inputStyle} value={settings.app_title} onChange={(e) => onUpdateSetting("app_title", e.target.value)} />
            </Field>
            <Field label="Church name line (above the title)">
              <input style={inputStyle} value={settings.org_name} onChange={(e) => onUpdateSetting("org_name", e.target.value)} />
            </Field>
            <Field label="Welcome line (top of the member page)">
              <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={settings.hero_text} onChange={(e) => onUpdateSetting("hero_text", e.target.value)} />
            </Field>
            <p style={{ fontSize: 12.5, color: C.inkSoft, margin: 0 }}>
              Groups, people, and rosters are now edited from the <strong style={{ color: C.ink }}>Groups</strong> tab — open any group to edit everything about it.
            </p>
          </div>
        </>
      )}

      <Announcements
        items={announcements}
        editable
        onAdd={onAddAnnouncement}
        onUpdate={onUpdateAnnouncement}
        onRemove={onRemoveAnnouncement}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 32 }}>
        <Stat label="Events this week" value={upcoming.length} />
        <Stat label="Tasks completed" value={`${doneCount} / ${allTasks.length}`} />
        <Stat label="Unassigned tasks" value={unassigned} alert={unassigned > 0} />
        <Stat label="Supplies running short" value={lowStock.length + lowCentral.length} alert={lowStock.length + lowCentral.length > 0} />
        <Stat label="Open lead tasks" value={openLeadTasks} alert={openLeadTasks > 0} />
      </div>

      <SectionLabel>Event readiness</SectionLabel>
      <div style={{ display: "grid", gap: 12, marginBottom: 36 }}>
        {upcoming.map((ev) => {
          const team = teams.find((t) => t.id === ev.teamId) || teams[0];
          const pct = progressOf(ev);
          const open = openTasks(ev).length;
          return (
            <button key={ev.id} onClick={() => onOpen(ev.id)} className="card-hover"
              style={{ textAlign: "left", background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, padding: "16px 18px" }}>
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
              <div style={{ height: 8, background: "#EFEADD", borderRadius: 999, overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(46,58,50,.08)" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${team.color}, ${team.color}B3)`, borderRadius: 999, transition: "width .3s ease", boxShadow: pct > 0 ? `0 0 6px ${team.color}55` : "none" }} />
              </div>
              <div style={{ fontSize: 12, color: open ? "#7A5416" : C.inkSoft, marginTop: 8, fontWeight: open ? 700 : 500 }}>
                {open ? `${open} task${open > 1 ? "s" : ""} still unassigned` : "All tasks assigned"}{team.lead ? ` · Lead: ${team.lead}` : ""}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <SectionLabel>Inventory watch</SectionLabel>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
        {lowStock.length === 0 && lowCentral.length === 0 && (
          <div style={{ padding: 18, fontSize: 13.5, color: C.inkSoft }}>All supplies are covered — church stock and this week's events.</div>
        )}
        {lowCentral.map((i, idx) => (
          <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 18px", borderTop: idx ? `1px solid ${C.line}` : "none" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{i.item || "Unnamed item"}</div>
              <div style={{ fontSize: 12, color: C.inkSoft }}>Church inventory{i.location ? ` · ${i.location}` : ""}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.danger }}>{i.have} of {i.need} needed</div>
          </div>
        ))}
        {lowStock.map((i, idx) => (
          <button key={`${i.eventId}-${i.id}`} onClick={() => onOpen(i.eventId)}
            style={{ display: "flex", width: "100%", textAlign: "left", background: "none", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 18px", border: "none", borderTop: idx + lowCentral.length ? `1px solid ${C.line}` : "none" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{i.item}</div>
              <div style={{ fontSize: 12, color: C.inkSoft }}>{i.event} · {i.date}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.danger }}>{i.have} of {i.need} needed</div>
          </button>
        ))}
      </div>
      <button onClick={() => onGoto("inventory")} style={{ ...btnGhost, marginBottom: 36 }}>Open full inventory →</button>

      <SectionLabel>Lead tasks</SectionLabel>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
        {leadTasks.filter((t) => t.status !== "done").length === 0 && (
          <div style={{ padding: 18, fontSize: 13.5, color: C.inkSoft }}>Nothing open. Add tasks for your leads in the Lead hub.</div>
        )}
        {leadTasks.filter((t) => t.status !== "done").slice(0, 5).map((t, idx) => {
          const team = teams.find((x) => x.id === t.teamId);
          const s = LT_STATUS[t.status] || LT_STATUS.todo;
          return (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "13px 18px", borderTop: idx ? `1px solid ${C.line}` : "none", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.title || "Untitled task"}</div>
                <div style={{ fontSize: 12, color: C.inkSoft }}>
                  {t.assignee ? `${t.assignee}` : "Unassigned"}{team ? ` · ${team.name}` : ""}{t.due ? ` · due ${t.due}` : ""}
                </div>
              </div>
              <span style={{ background: s.bg, color: s.fg, borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{s.label}</span>
            </div>
          );
        })}
      </div>
      <button onClick={() => onGoto("hub")} style={{ ...btnGhost, marginBottom: 36 }}>Open the Lead hub →</button>

      <SectionLabel>Lead activity</SectionLabel>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, overflow: "hidden", marginBottom: 36 }}>
        {activity.length === 0 && (
          <div style={{ padding: 18, fontSize: 13.5, color: C.inkSoft }}>No activity yet — assignments and signups will show up here.</div>
        )}
        {activity.map((a, idx) => {
          const team = teams.find((t) => t.id === a.team_id);
          return (
            <div key={a.id || idx} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "13px 18px", borderTop: idx ? `1px solid ${C.line}` : "none" }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: team ? team.color : C.inkSoft, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13.5 }}><strong>{a.who}</strong> {a.what}</span>
                <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{team ? `${team.name} · ` : ""}{timeAgo(a.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>

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
            <button key={ev.id} onClick={() => onOpen(ev.id)} className="card-hover" style={{ textAlign: "left", background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, padding: 20 }}>
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
    <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 16, padding: 20 }}>
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

function EventDetail({ ev, team, teams, isAdmin, editing, setEditing, onBack, onUpdate, onDelete, onSignup, onLog, ping }) {
  const pct = progressOf(ev);
  const [signupName, setSignupName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const t = team || teams[0];

  const setTask = (taskId, patch) =>
    onUpdate((e) => ({ tasks: e.tasks.map((x) => (x.id === taskId ? { ...x, ...patch } : x)) }));

  const copyDetails = async () => {
    const needs = openTasks(ev).map((x) => `• ${x.name}`).join("\n");
    const text = [
      `${ev.title} — ${t.name}`,
      `${ev.day}, ${ev.date} · ${ev.time}`,
      `Where: ${ev.location}`,
      ev.goal ? `Goal: ${ev.goal}` : null,
      needs ? `\nStill needed:\n${needs}` : null,
    ].filter(Boolean).join("\n");
    const ok = await copyToClipboard(text);
    ping(ok ? "Details copied — paste into a text or the bulletin" : "Couldn't copy on this device");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.pine, fontSize: 13.5, fontWeight: 700, padding: 0 }}>
          ← Back
        </button>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={copyDetails} style={btnGhost}>⧉ Copy details</button>
          {isAdmin && (
            <button onClick={() => setEditing(!editing)} style={editing ? btnPrimary : btnGhost}>
              {editing ? "Done editing" : "✎ Edit this activity"}
            </button>
          )}
        </div>
      </div>

      <div className="arch" style={{ background: `radial-gradient(420px 190px at 50% -30px, rgba(255,255,255,.75), transparent 70%), linear-gradient(180deg, ${tint(t.color)}, #FFFFFF 140%)`, border: `1px solid ${C.line}`, borderTop: `3px solid ${t.color}`, boxShadow: `${C.shadow}, inset 0 0 0 1px rgba(255,255,255,.7)`, padding: "40px 24px 24px", textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 50, height: 60, margin: "0 auto", borderRadius: "999px 999px 9px 9px", background: "#fff", border: `1px solid ${C.line}`, boxShadow: "0 2px 8px rgba(46,58,50,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: t.color }}>{t.icon}</div>
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

      <SectionLabel>The goal</SectionLabel>
      {editing ? (
        <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical", marginBottom: 28 }} value={ev.goal}
          onChange={(e) => onUpdate({ goal: e.target.value })}
          placeholder="What is the ultimate goal of this activity?" />
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderLeft: `4px solid ${t.color}`, borderRadius: 12, padding: "16px 18px", fontSize: 14.5, lineHeight: 1.7, marginBottom: 28 }}>
          {ev.goal || <span style={{ color: C.inkSoft }}>No goal written yet.</span>}
        </div>
      )}

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

      <SectionLabel>{isAdmin ? "Delegate tasks" : "Volunteer roles"} · {pct}% done</SectionLabel>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, overflow: "hidden", marginBottom: editing ? 10 : 28 }}>
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
                <select value={task.assignee || ""} onChange={(e) => { setTask(task.id, { assignee: e.target.value || null }); if (e.target.value) { ping(`Assigned to ${e.target.value}`); onLog && onLog(`assigned \u201C${task.name}\u201D to ${e.target.value}`); } }}
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
        <button onClick={() => { onUpdate((x) => ({ tasks: [...x.tasks, { id: uid(), name: "New task", assignee: null, done: false }] })); if (!editing) setEditing(true); }}
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

      {(ev.inventory.length > 0 || isAdmin) && (
        <>
          <SectionLabel>Supplies & inventory</SectionLabel>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, overflow: "hidden", marginBottom: isAdmin ? 10 : 28 }}>
            {ev.inventory.length === 0 && <div style={{ padding: 16, fontSize: 13.5, color: C.inkSoft }}>Nothing tracked yet{isAdmin ? " — add the supplies this activity needs below." : "."}</div>}
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
                      {isAdmin && (
                        <span style={{ display: "inline-flex", gap: 4 }}>
                          <button onClick={() => onUpdate((x) => ({ inventory: x.inventory.map((y) => (y.id === i.id ? { ...y, have: Math.max(0, Number(y.have) - 1) } : y)) }))}
                            aria-label={`One less ${i.item}`} style={{ ...removeBtn, color: C.ink, width: 26, height: 26 }}>−</button>
                          <button onClick={() => onUpdate((x) => ({ inventory: x.inventory.map((y) => (y.id === i.id ? { ...y, have: Number(y.have) + 1 } : y)) }))}
                            aria-label={`One more ${i.item}`} style={{ ...removeBtn, color: C.pine, width: 26, height: 26 }}>+</button>
                        </span>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 700, color: short ? C.danger : C.pine }}>
                        {i.have} on hand · {i.need} needed {short ? "· short" : "✓"}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {isAdmin && (
            <button onClick={() => { onUpdate((x) => ({ inventory: [...x.inventory, { id: uid(), item: "New item", have: 0, need: 0 }] })); if (!editing) setEditing(true); }}
              style={{ ...btnGhost, marginBottom: 28 }}>
              + Add an item
            </button>
          )}
        </>
      )}

      {isAdmin && (
        <>
          <SectionLabel>Progress report</SectionLabel>
          {ev.report ? (
            <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, padding: 20, marginBottom: 28 }}>
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
              onClick={() => { onUpdate({ status: "past", report: { attendance: 0, newVisitors: 0, highlights: "", followUps: "" } }); onLog && onLog(`filed a progress report for \u201C${ev.title}\u201D`); ping("Report started — this activity is now marked as finished"); }}
              style={{ ...btnPrimary, marginBottom: 28 }}>
              File progress report (marks activity finished)
            </button>
          )}
        </>
      )}

      {!isAdmin && ev.report && (
        <>
          <SectionLabel>How it went</SectionLabel>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, padding: 20, marginBottom: 28 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 14 }}>
              <MiniStat label="Attendance" value={ev.report.attendance} />
              <MiniStat label="New visitors" value={ev.report.newVisitors} />
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{ev.report.highlights}</p>
          </div>
        </>
      )}

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
    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.inkSoft, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <span aria-hidden="true" style={{ width: 11, height: 14, borderRadius: "999px 999px 2px 2px", background: `linear-gradient(180deg, ${C.gold}, ${C.amber})`, flexShrink: 0, boxShadow: "0 1px 2px rgba(122,84,22,.25)" }} />
      {children}
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.line}, transparent)` }} />
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
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "18px 18px 16px", boxShadow: `${C.shadow}, inset 0 1px 0 rgba(255,255,255,.8)`, position: "relative", overflow: "hidden" }}>
      <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: alert ? `linear-gradient(90deg, ${C.danger}, #C97A63)` : `linear-gradient(90deg, ${C.pine}, #6D8F79)` }} />
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 31, fontWeight: 600, letterSpacing: "-0.01em", color: alert ? C.danger : C.ink, fontVariantNumeric: "tabular-nums" }}>{value}</div>
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
  background: `linear-gradient(180deg, #4C6E55, ${C.pine} 55%, #35503F)`,
  color: "#fff", border: "none", borderRadius: 999,
  padding: "10px 20px", fontSize: 13, fontWeight: 700, letterSpacing: "0.01em",
  boxShadow: "0 2px 6px rgba(35,44,39,.24), inset 0 1px 0 rgba(255,255,255,.18)",
  textShadow: "0 1px 1px rgba(0,0,0,.15)",
};
const btnGhost = {
  background: "#FFFFFF", color: C.pine, border: `1px solid #DCD4C2`, borderRadius: 999,
  padding: "10px 20px", fontSize: 13, fontWeight: 700, letterSpacing: "0.01em",
  boxShadow: "0 1px 2px rgba(35,44,39,.06), inset 0 1px 0 rgba(255,255,255,.9)",
};
const btnDanger = {
  background: C.danger, color: "#fff", border: "none", borderRadius: 999,
  padding: "8px 16px", fontSize: 13, fontWeight: 700,
  boxShadow: "0 1px 2px rgba(35,44,39,.2)",
};
const removeBtn = {
  border: "none", background: C.paper, color: C.danger, borderRadius: 999,
  width: 28, height: 28, fontSize: 15, fontWeight: 700, flexShrink: 0,
};

/* ------------------------- database upgrade notice ------------------ */

function DbUpgradeNotice() {
  return (
    <div style={{ background: `linear-gradient(180deg, #F9EDD2, ${C.amberSoft})`, border: `1px solid #E9D3A4`, borderLeft: `4px solid ${C.amber}`, borderRadius: 14, padding: "14px 18px", boxShadow: C.shadow, marginBottom: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#5C440F" }}>One quick database update needed</div>
      <p style={{ fontSize: 13, lineHeight: 1.6, color: "#5C440F", margin: "6px 0 0" }}>
        This section stores its data in three new tables. Open Supabase → SQL Editor, paste the contents of{" "}
        <strong>supabase/add-hub-inventory.sql</strong> from the project, and click Run (takes under a minute, safe to run twice).
        Until then, anything you add here won't be saved.
      </p>
    </div>
  );
}

/* ------------------------------ stepper ----------------------------- */

const stepBtn = {
  border: "none", background: C.paper, color: C.ink, width: 28, height: 32,
  fontSize: 15, fontWeight: 700, flexShrink: 0,
};

function Stepper({ label, value, onChange }) {
  return (
    <label style={{ fontSize: 11.5, color: C.inkSoft, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {label}
      <span style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${C.line}`, borderRadius: 999, overflow: "hidden", background: "#fff" }}>
        <button onClick={() => onChange(Math.max(0, Number(value || 0) - 1))} aria-label={`Decrease ${label}`} style={stepBtn}>−</button>
        <input type="number" min="0" value={value} aria-label={label}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          style={{ width: 54, border: "none", textAlign: "center", fontSize: 13.5, padding: "7px 0", fontFamily: "inherit", color: C.ink, outline: "none" }} />
        <button onClick={() => onChange(Number(value || 0) + 1)} aria-label={`Increase ${label}`} style={stepBtn}>+</button>
      </span>
    </label>
  );
}

/* ----------------------------- groups view -------------------------- */

function GroupsView({ teams, events, isAdmin, onOpenTeam, onNewTeam }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: "4px 0 4px" }}>Small groups</h2>
          <p style={{ fontSize: 13, color: C.inkSoft, margin: 0 }}>
            {teams.length} group{teams.length === 1 ? "" : "s"}{isAdmin ? " · open any group to edit everything about it" : " · tap a group to see what they're up to"}
          </p>
        </div>
        {isAdmin && <button onClick={onNewTeam} style={btnPrimary}>+ New small group</button>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {teams.length === 0 && (
          <div style={{ background: C.card, border: `1px dashed ${C.line}`, borderRadius: 14, padding: 24, fontSize: 13.5, color: C.inkSoft }}>
            No groups yet{isAdmin ? " — create your first one above." : "."}
          </div>
        )}
        {teams.map((team) => {
          const upcoming = events.filter((e) => e.teamId === team.id && e.status === "upcoming");
          const next = upcoming[0];
          return (
            <button key={team.id} onClick={() => onOpenTeam(team.id)} className="arch card-hover"
              style={{ textAlign: "left", border: `1px solid ${C.line}`, background: C.card, padding: "38px 20px 20px", position: "relative", overflow: "hidden", boxShadow: `${C.shadow}, inset 0 0 0 1px rgba(255,255,255,.7)` }}>
              <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 74, background: `linear-gradient(180deg, ${tint(team.color)}, rgba(255,255,255,0))`, opacity: 0.9 }} />
              <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${team.color}, ${team.color}99)` }} />
              <span aria-hidden="true" style={{ position: "absolute", top: 14, right: 14, fontSize: 42, color: team.color, opacity: 0.14, transform: "rotate(-6deg)", pointerEvents: "none" }}>{team.icon}</span>
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ width: 38, height: 46, borderRadius: "999px 999px 8px 8px", background: "#fff", border: `1px solid ${C.line}`, color: team.color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, boxShadow: "0 1px 3px rgba(46,58,50,.1)" }}>{team.icon}</span>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600 }}>{team.name}</span>
                </div>
                <p style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6, margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {team.goal || "No goal written yet."}
                </p>
                <div style={{ fontSize: 12, color: C.inkSoft }}>
                  {team.lead ? <>Led by <strong style={{ color: C.ink }}>{team.lead}</strong> · </> : "No lead set · "}
                  {team.volunteers.length} volunteer{team.volunteers.length === 1 ? "" : "s"}
                </div>
                <div style={{ marginTop: 10, display: "inline-block", background: next ? tint(team.color) : C.paper, color: next ? team.color : C.inkSoft, borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, boxShadow: next ? `inset 0 0 0 1px ${team.color}44` : "none" }}>
                  {next ? `Next: ${next.title} · ${next.date}` : "Nothing scheduled"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------- group detail -------------------------- */

function GroupDetail({ team, events, leadTasks, isAdmin, editing, setEditing, onBack, onUpdate, onDelete, onOpenEvent, onNewEvent, ping }) {
  const upcoming = events.filter((e) => e.teamId === team.id && e.status === "upcoming");
  const past = events.filter((e) => e.teamId === team.id && e.status === "past");
  const groupTasks = leadTasks.filter((t) => t.teamId === team.id && t.status !== "done");

  const EventRow = ({ ev }) => (
    <button onClick={() => onOpenEvent(ev.id)} className="card-hover"
      style={{ display: "flex", width: "100%", textAlign: "left", background: C.card, justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 16px", border: `1px solid ${C.line}`, borderRadius: 12, boxShadow: C.shadow, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{ev.title}</div>
        <div style={{ fontSize: 12.5, color: C.inkSoft }}>{ev.day}, {ev.date} · {ev.time}{ev.location ? ` · ${ev.location}` : ""}</div>
      </div>
      {ev.status === "past" ? (
        <span style={{ background: ev.report ? "#E7EFE8" : C.amberSoft, color: ev.report ? C.pine : "#7A5416", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
          {ev.report ? "Report filed" : "Report needed"}
        </span>
      ) : (
        <span style={{ fontSize: 12.5, fontWeight: 700, color: progressOf(ev) === 100 ? C.pine : C.inkSoft }}>{progressOf(ev)}% ready</span>
      )}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.pine, fontSize: 13.5, fontWeight: 700, padding: 0 }}>
          ← Back
        </button>
        {isAdmin && (
          <button onClick={() => setEditing(!editing)} style={editing ? btnPrimary : btnGhost}>
            {editing ? "Done editing" : "✎ Edit this group"}
          </button>
        )}
      </div>

      <div className="arch" style={{ background: `radial-gradient(420px 190px at 50% -30px, rgba(255,255,255,.75), transparent 70%), linear-gradient(180deg, ${tint(team.color)}, #FFFFFF 140%)`, border: `1px solid ${C.line}`, borderTop: `3px solid ${team.color}`, boxShadow: `${C.shadow}, inset 0 0 0 1px rgba(255,255,255,.7)`, padding: "40px 24px 24px", textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 50, height: 60, margin: "0 auto", borderRadius: "999px 999px 9px 9px", background: "#fff", border: `1px solid ${C.line}`, boxShadow: "0 2px 8px rgba(46,58,50,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: team.color }}>{team.icon}</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, margin: "8px 0 8px" }}>{team.name}</h2>
        <div style={{ fontSize: 14, color: C.inkSoft }}>
          {team.lead ? <>Led by <strong style={{ color: C.ink }}>{team.lead}</strong> · </> : null}
          {team.volunteers.length} volunteer{team.volunteers.length === 1 ? "" : "s"} · {upcoming.length} upcoming activit{upcoming.length === 1 ? "y" : "ies"}
        </div>
      </div>

      {editing ? (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Edit group</SectionLabel>
          <TeamEditor team={team} onUpdate={onUpdate} onDelete={onDelete} ping={ping} />
        </div>
      ) : (
        <>
          <SectionLabel>Our purpose</SectionLabel>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderLeft: `4px solid ${team.color}`, borderRadius: 12, padding: "16px 18px", fontSize: 14.5, lineHeight: 1.7, marginBottom: 28 }}>
            {team.goal || <span style={{ color: C.inkSoft }}>No goal written yet{isAdmin ? " — tap “Edit this group” to add one." : "."}</span>}
          </div>

          <SectionLabel>The team</SectionLabel>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, padding: "16px 18px", marginBottom: 28 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {team.lead && (
                <span style={{ background: "#E7EFE8", color: C.pine, borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>
                  {team.lead} · Lead
                </span>
              )}
              {team.volunteers.filter((v) => v !== team.lead).map((v) => (
                <span key={v} style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 600 }}>
                  {v}
                </span>
              ))}
              {!team.lead && team.volunteers.length === 0 && (
                <span style={{ fontSize: 13.5, color: C.inkSoft }}>No one on the roster yet{isAdmin ? " — tap “Edit this group” to add people." : "."}</span>
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <SectionLabel>Upcoming activities</SectionLabel>
      </div>
      <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        {upcoming.length === 0 && (
          <div style={{ background: C.card, border: `1px dashed ${C.line}`, borderRadius: 12, padding: 18, fontSize: 13.5, color: C.inkSoft }}>
            Nothing on the calendar yet.
          </div>
        )}
        {upcoming.map((ev) => <EventRow key={ev.id} ev={ev} />)}
      </div>
      {isAdmin && (
        <button onClick={onNewEvent} style={{ ...btnGhost, marginBottom: 28 }}>+ New activity for this group</button>
      )}

      {isAdmin && groupTasks.length > 0 && (
        <>
          <SectionLabel>Open lead tasks for this group</SectionLabel>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, overflow: "hidden", marginBottom: 28 }}>
            {groupTasks.map((t, idx) => {
              const s = LT_STATUS[t.status] || LT_STATUS.todo;
              return (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: idx ? `1px solid ${C.line}` : "none", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.title || "Untitled task"}</div>
                    <div style={{ fontSize: 12, color: C.inkSoft }}>{t.assignee || "Unassigned"}{t.due ? ` · due ${t.due}` : ""}</div>
                  </div>
                  <span style={{ background: s.bg, color: s.fg, borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <SectionLabel>Past activities</SectionLabel>
          <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
            {past.map((ev) => <EventRow key={ev.id} ev={ev} />)}
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------- inventory view ------------------------- */

function InventoryView({ inventory, teams, events, isAdmin, needsDbUpgrade, onAdd, onUpdate, onRemove, onOpenEvent, ping }) {
  const [q, setQ] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [confirmId, setConfirmId] = useState(null);

  const low = inventory.filter((i) => Number(i.have) < Number(i.need));
  const eventShort = events
    .filter((e) => e.status === "upcoming")
    .flatMap((e) => e.inventory.filter((i) => Number(i.have) < Number(i.need)).map((i) => ({ ...i, event: e.title, date: e.date, eventId: e.id })));

  const filtered = inventory
    .filter((i) => teamFilter === "all" || (teamFilter === "church" ? !i.teamId : i.teamId === teamFilter))
    .filter((i) => {
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return [i.item, i.category, i.location, i.notes].some((x) => (x || "").toLowerCase().includes(needle));
    })
    .sort((a, b) => (a.category || "").localeCompare(b.category || "") || (a.item || "").localeCompare(b.item || ""));

  const copyShoppingList = async () => {
    const lines = [
      ...low.map((i) => `• ${i.item || "Unnamed item"} — need ${Math.max(0, i.need - i.have)} more${i.unit ? ` ${i.unit}` : ""}${i.location ? ` (${i.location})` : ""}`),
      ...eventShort.map((i) => `• ${i.item} — need ${Math.max(0, i.need - i.have)} more (for ${i.event}, ${i.date})`),
    ];
    if (!lines.length) { ping("Nothing is running short — no list to copy"); return; }
    const ok = await copyToClipboard(`Shopping list — ${shortDate()}\n${lines.join("\n")}`);
    ping(ok ? "Shopping list copied — paste it anywhere" : "Couldn't copy on this device");
  };

  let lastCategory = null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: "4px 0 4px" }}>Inventory</h2>
          <p style={{ fontSize: 13, color: C.inkSoft, margin: 0 }}>
            {isAdmin ? "Everything the church keeps on hand — counts save automatically." : "What we keep on hand for our ministries."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={copyShoppingList} style={btnGhost}>⧉ Copy shopping list</button>
          {isAdmin && <button onClick={() => onAdd(teamFilter !== "all" && teamFilter !== "church" ? teamFilter : null)} style={btnPrimary}>+ Add item</button>}
        </div>
      </div>

      {needsDbUpgrade && <DbUpgradeNotice />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Stat label="Items tracked" value={inventory.length} />
        <Stat label="Running short" value={low.length} alert={low.length > 0} />
        <Stat label="Event supplies short" value={eventShort.length} alert={eventShort.length > 0} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <input style={{ ...inputStyle, flex: "1 1 220px", maxWidth: 420 }} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search items, categories, locations…" aria-label="Search inventory" />
        <select style={{ ...inputStyle, width: "auto", background: "#fff" }} value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} aria-label="Filter by group">
          <option value="all">All items</option>
          <option value="church">Church-wide</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gap: 10, marginBottom: 36 }}>
        {filtered.length === 0 && (
          <div style={{ background: C.card, border: `1px dashed ${C.line}`, borderRadius: 14, padding: 20, fontSize: 13.5, color: C.inkSoft }}>
            {inventory.length === 0
              ? (isAdmin ? "Nothing tracked yet — add your first item above (coffee, cups, craft supplies, hymn sheets…)." : "Nothing tracked yet.")
              : "No items match that search."}
          </div>
        )}
        {filtered.map((i) => {
          const short = Number(i.have) < Number(i.need);
          const owner = teams.find((t) => t.id === i.teamId);
          const header = (i.category || "General") !== lastCategory ? (lastCategory = i.category || "General") : null;
          return (
            <React.Fragment key={i.id}>
              {header && !q.trim() && (
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.inkSoft, margin: "8px 0 0" }}>{header}</div>
              )}
              <div style={{ background: C.card, border: `1px solid ${short ? "#E4C4BB" : C.line}`, boxShadow: C.shadow, borderRadius: 14, padding: "14px 16px" }}>
                {isAdmin ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <input style={{ ...inputStyle, flex: "2 1 180px", fontWeight: 600 }} value={i.item} placeholder="Item name"
                        onChange={(e) => onUpdate(i.id, { item: e.target.value })} aria-label="Item name" />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: short ? C.danger : C.pine, flexShrink: 0 }}>
                        {short ? `${Math.max(0, i.need - i.have)} short` : "✓ covered"}
                      </span>
                      {confirmId === i.id ? (
                        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <button onClick={() => { onRemove(i.id); setConfirmId(null); }} style={{ ...btnDanger, padding: "6px 12px" }}>Remove</button>
                          <button onClick={() => setConfirmId(null)} style={{ ...btnGhost, padding: "6px 12px" }}>Keep</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmId(i.id)} aria-label={`Remove ${i.item || "item"}`} style={removeBtn}>×</button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <Stepper label="Have" value={i.have} onChange={(v) => onUpdate(i.id, { have: v })} />
                      <Stepper label="Need" value={i.need} onChange={(v) => onUpdate(i.id, { need: v })} />
                      <input style={{ ...inputStyle, width: 90 }} value={i.unit} placeholder="Unit"
                        onChange={(e) => onUpdate(i.id, { unit: e.target.value })} aria-label="Unit" />
                      <input style={{ ...inputStyle, width: 130 }} value={i.category} placeholder="Category"
                        onChange={(e) => onUpdate(i.id, { category: e.target.value })} aria-label="Category" />
                      <select style={{ ...inputStyle, width: "auto", background: C.paper }} value={i.teamId || ""}
                        onChange={(e) => onUpdate(i.id, { teamId: e.target.value || null })} aria-label="Owning group">
                        <option value="">Church-wide</option>
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <input style={{ ...inputStyle, flex: "1 1 140px" }} value={i.location} placeholder="Where it's stored"
                        onChange={(e) => onUpdate(i.id, { location: e.target.value })} aria-label="Storage location" />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{i.item || "Unnamed item"}</div>
                      <div style={{ fontSize: 12, color: C.inkSoft }}>
                        {owner ? owner.name : "Church-wide"}{i.location ? ` · ${i.location}` : ""}
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: short ? C.danger : C.pine }}>
                      {i.have} on hand · {i.need} needed{i.unit ? ` (${i.unit})` : ""} {short ? "· short" : "✓"}
                    </span>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {eventShort.length > 0 && (
        <>
          <SectionLabel>Event supplies running short</SectionLabel>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, overflow: "hidden" }}>
            {eventShort.map((i, idx) => (
              <button key={`${i.eventId}-${i.id}`} onClick={() => onOpenEvent(i.eventId)}
                style={{ display: "flex", width: "100%", textAlign: "left", background: "none", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 18px", border: "none", borderTop: idx ? `1px solid ${C.line}` : "none" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{i.item}</div>
                  <div style={{ fontSize: 12, color: C.inkSoft }}>{i.event} · {i.date}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.danger }}>{i.have} of {i.need} needed</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------- lead hub view ------------------------- */

function TeamHubView({ leadTasks, messages, teams, people, needsDbUpgrade, onAddTask, onUpdateTask, onRemoveTask, onPost, onRemoveMessage, onLog, ping }) {
  const [me, setMe] = useState(() => {
    try { return localStorage.getItem("mtg_lead_name") || ""; } catch (e) { return ""; }
  });
  const setMePersist = (v) => {
    setMe(v);
    try { localStorage.setItem("mtg_lead_name", v); } catch (e) { /* private browsing */ }
  };
  const [statusFilter, setStatusFilter] = useState("open");
  const [teamFilter, setTeamFilter] = useState("all");
  const [draft, setDraft] = useState("");
  const [draftTeam, setDraftTeam] = useState("");
  const [confirmTaskId, setConfirmTaskId] = useState(null);
  const [confirmMsgId, setConfirmMsgId] = useState(null);

  const names = [...new Set([
    ...people.map((p) => p.name),
    ...teams.flatMap((t) => [t.lead, ...t.volunteers]),
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const tasks = [...leadTasks]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .filter((t) => (statusFilter === "all" ? true : statusFilter === "open" ? t.status !== "done" : t.status === statusFilter))
    .filter((t) => teamFilter === "all" || t.teamId === teamFilter);

  const feed = [...messages].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const cycleStatus = (t) => {
    const next = (LT_STATUS[t.status] || LT_STATUS.todo).next;
    onUpdateTask(t.id, { status: next });
    if (next === "done") onLog(`completed "${t.title || "a task"}"`, t.teamId, me || t.assignee || "A lead");
  };

  const post = () => {
    const body = draft.trim();
    if (!body) return;
    if (!me.trim()) { ping("Add your name first so leads know who's posting"); return; }
    onPost(me.trim(), body, draftTeam || null);
    setDraft("");
    ping("Posted to the board");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: "4px 0 4px" }}>Lead hub</h2>
          <p style={{ fontSize: 13, color: C.inkSoft, margin: 0 }}>
            Tasks and updates for group leads — everything here saves and syncs live to every lead's device.
          </p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.inkSoft, fontWeight: 600 }}>
          You are:
          <input style={{ ...inputStyle, width: 160 }} value={me} onChange={(e) => setMePersist(e.target.value)}
            placeholder="Your name" aria-label="Your name" list="hub-names" />
          <datalist id="hub-names">
            {names.map((n) => <option key={n} value={n} />)}
          </datalist>
        </label>
      </div>

      {needsDbUpgrade && <DbUpgradeNotice />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, alignItems: "start" }}>
        {/* -------- task tracker -------- */}
        <div>
          <SectionLabel>Task tracker</SectionLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {[["open", "Open"], ["todo", "To do"], ["doing", "In progress"], ["done", "Done"], ["all", "All"]].map(([v, label]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                style={{
                  border: `1px solid ${statusFilter === v ? C.pine : C.line}`,
                  background: statusFilter === v ? "#E7EFE8" : "#fff",
                  color: statusFilter === v ? C.pine : C.inkSoft,
                  borderRadius: 999, padding: "6px 14px", fontSize: 12.5, fontWeight: 700,
                }}>
                {label}
              </button>
            ))}
            <select style={{ ...inputStyle, width: "auto", background: "#fff" }} value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)} aria-label="Filter tasks by group">
              <option value="all">All groups</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <button onClick={() => onAddTask(teamFilter !== "all" ? teamFilter : null)} style={{ ...btnPrimary, marginBottom: 12 }}>+ New task</button>

          <div style={{ display: "grid", gap: 10 }}>
            {tasks.length === 0 && (
              <div style={{ background: C.card, border: `1px dashed ${C.line}`, borderRadius: 14, padding: 20, fontSize: 13.5, color: C.inkSoft }}>
                {leadTasks.length === 0 ? "No tasks yet — add the first one for your leads." : "Nothing matches these filters."}
              </div>
            )}
            {tasks.map((t) => {
              const s = LT_STATUS[t.status] || LT_STATUS.todo;
              const team = teams.find((x) => x.id === t.teamId);
              return (
                <div key={t.id} style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, padding: "14px 16px", display: "grid", gap: 10, opacity: t.status === "done" ? 0.75 : 1 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <input style={{ ...inputStyle, flex: "1 1 160px", fontWeight: 600, textDecoration: t.status === "done" ? "line-through" : "none" }}
                      value={t.title} placeholder="What needs doing?"
                      onChange={(e) => onUpdateTask(t.id, { title: e.target.value })} aria-label="Task title" />
                    <button onClick={() => cycleStatus(t)} title="Tap to move to the next status"
                      style={{ background: s.bg, color: s.fg, border: "none", borderRadius: 999, padding: "7px 14px", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {s.label} →
                    </button>
                    {confirmTaskId === t.id ? (
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <button onClick={() => { onRemoveTask(t.id); setConfirmTaskId(null); }} style={{ ...btnDanger, padding: "6px 12px" }}>Remove</button>
                        <button onClick={() => setConfirmTaskId(null)} style={{ ...btnGhost, padding: "6px 12px" }}>Keep</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmTaskId(t.id)} aria-label="Remove task" style={removeBtn}>×</button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select style={{ ...inputStyle, width: "auto", background: C.paper }} value={t.assignee || ""}
                      onChange={(e) => { onUpdateTask(t.id, { assignee: e.target.value }); if (e.target.value) { onLog(`assigned "${t.title || "a task"}" to ${e.target.value}`, t.teamId, me || "Admin"); ping(`Assigned to ${e.target.value}`); } }}
                      aria-label="Assign task">
                      <option value="">Unassigned</option>
                      {names.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <select style={{ ...inputStyle, width: "auto", background: C.paper }} value={t.teamId || ""}
                      onChange={(e) => onUpdateTask(t.id, { teamId: e.target.value || null })} aria-label="Task group">
                      <option value="">No group</option>
                      {teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                    <input style={{ ...inputStyle, width: 120 }} value={t.due} placeholder="Due (Jul 20)"
                      onChange={(e) => onUpdateTask(t.id, { due: e.target.value })} aria-label="Due date" />
                  </div>
                  <textarea style={{ ...inputStyle, minHeight: 40, resize: "vertical" }} value={t.details}
                    placeholder="Details, links, phone numbers…"
                    onChange={(e) => onUpdateTask(t.id, { details: e.target.value })} aria-label="Task details" />
                  {team && (
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: team.color }}>{team.name}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* -------- message board -------- */}
        <div>
          <SectionLabel>Message board</SectionLabel>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, padding: 16, display: "grid", gap: 10, marginBottom: 14 }}>
            <textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Share an update with the other leads — what's done, what's stuck, what you need…"
              aria-label="New message" />
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select style={{ ...inputStyle, width: "auto", background: C.paper }} value={draftTeam}
                onChange={(e) => setDraftTeam(e.target.value)} aria-label="Tag a group">
                <option value="">General</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button onClick={post} style={btnPrimary}>Post update</button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {feed.length === 0 && (
              <div style={{ background: C.card, border: `1px dashed ${C.line}`, borderRadius: 14, padding: 20, fontSize: 13.5, color: C.inkSoft }}>
                No updates yet — be the first to post.
              </div>
            )}
            {feed.map((m) => {
              const team = teams.find((t) => t.id === m.teamId);
              return (
                <div key={m.id} style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow, borderRadius: 14, padding: "13px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{m.author}</span>
                      {team && (
                        <span style={{ border: `1px solid ${team.color}`, background: tint(team.color), color: team.color, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                          {team.name}
                        </span>
                      )}
                      <span style={{ fontSize: 11.5, color: C.inkSoft }}>{timeAgo(m.createdAt)}</span>
                    </div>
                    {confirmMsgId === m.id ? (
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <button onClick={() => { onRemoveMessage(m.id); setConfirmMsgId(null); }} style={{ ...btnDanger, padding: "5px 10px", fontSize: 12 }}>Delete</button>
                        <button onClick={() => setConfirmMsgId(null)} style={{ ...btnGhost, padding: "5px 10px", fontSize: 12 }}>Keep</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmMsgId(m.id)} aria-label="Delete message"
                        style={{ ...removeBtn, width: 22, height: 22, fontSize: 12, color: C.inkSoft }}>×</button>
                    )}
                  </div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{m.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
