"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  getMembers, getActivities, getReservations, getCheckins, getAnnouncements,
  setActivity, deleteActivity, addMember, updateMember, deleteMember,
  addAnnouncement, deleteAnnouncement,
  onMembersChange, onActivitiesChange, onReservationsChange, onAnnouncementsChange,
  todayStr, formatDate, formatTime, diffMinutes,
  type Member, type Activity, type CheckinRecord, type Announcement,
} from "@/lib/firebase";

const GC: Record<number, string> = { 3: "#2563eb", 2: "#8b5cf6", 1: "#f59e0b" };
const GB: Record<number, string> = { 3: "#dbeafe", 2: "#ede9fe", 1: "#fef3c7" };

const NAV = [
  { id: "home", path: "/teacher?page=home", label: "ホーム", icon: "🏠" },
  { id: "calendar", path: "/teacher?page=calendar", label: "活動日管理", icon: "📅" },
  { id: "dashboard", path: "/teacher?page=dashboard", label: "ダッシュボード", icon: "📊" },
  { id: "members", path: "/teacher?page=members", label: "部員管理", icon: "👥" },
  { id: "announce", path: "/teacher?page=announce", label: "お知らせ", icon: "📢" },
];

export default function TeacherPageWrapper() {
  return (
    <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
      <TeacherPage />
    </Suspense>
  );
}

function TeacherPage() {
  const searchParams = useSearchParams();
  const page = searchParams.get("page") || "home";
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Record<string, Activity>>({});
  const [reservations, setReservations] = useState<Record<string, string[]>>({});
  const [checkins, setCheckins] = useState<Record<string, Record<string, CheckinRecord>>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setCheckins(await getCheckins());
      setLoading(false);
    })();
    const u1 = onMembersChange(setMembers);
    const u2 = onActivitiesChange(setActivities);
    const u3 = onReservationsChange(setReservations);
    const u4 = onAnnouncementsChange(setAnnouncements);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <AppShell title="水中ロボット部" subtitle="顧問用" navItems={NAV} activePage={page}>
      {page === "home" && <TeacherHome activities={activities} reservations={reservations} checkins={checkins} members={members} />}
      {page === "calendar" && <ActMgr activities={activities} />}
      {page === "dashboard" && <Dashboard members={members} activities={activities} reservations={reservations} checkins={checkins} />}
      {page === "members" && <MemMgr members={members} />}
      {page === "announce" && <AnnMgr announcements={announcements} />}
    </AppShell>
  );
}

function TeacherHome({ activities, reservations, checkins, members }: {
  activities: Record<string, Activity>; reservations: Record<string, string[]>; checkins: Record<string, Record<string, CheckinRecord>>; members: Member[];
}) {
  const t = todayStr();
  const tAct = activities[t], tRes = reservations[t] || [], dc = checkins[t] || {};
  const inN = members.filter((m) => dc[m.id]?.inTime && !dc[m.id]?.outTime).length;
  const router = useRouter();

  return (
    <div className="page">
      <div className="mb-4">
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>📊 顧問ホーム</h2>
        <p className="text-muted text-sm" style={{ marginTop: 4 }}>{formatDate(t)}</p>
      </div>
      <div className="card" style={{ background: tAct ? "linear-gradient(135deg,#ecfdf5,#d1fae5)" : undefined }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#059669", marginBottom: 6 }}>今日の活動</div>
        {tAct ? (<>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{tAct.title || "通常活動"}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 13 }}>
            <span>予約: <strong>{tRes.length}人</strong></span>
            <span>在室: <strong className="text-green">{inN}人</strong></span>
          </div>
        </>) : (<div className="text-sm text-hint">活動なし</div>)}
      </div>
      <div className="grid-2">
        <button onClick={() => router.push("/teacher?page=calendar")} className="quick-btn"><span className="icon">📅</span><span className="label">活動日管理</span></button>
        <button onClick={() => router.push("/teacher?page=dashboard")} className="quick-btn"><span className="icon">📊</span><span className="label">ダッシュボード</span></button>
      </div>
    </div>
  );
}

function getMonthDays(y: number, m: number): (string | null)[] {
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const days: (string | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++)
    days.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  return days;
}

function ActMgr({ activities }: { activities: Record<string, Activity> }) {
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [form, setForm] = useState({ title: "通常活動", time: "放課後", memo: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"add" | "delete">("add");
  const [message, setMessage] = useState("");
  const days = getMonthDays(viewDate.y, viewDate.m);
  const today = todayStr();

  const prev = () => setViewDate((v) => v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 });
  const next = () => setViewDate((v) => v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 });

  const toggleDate = (d: string) => {
    setSelected((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const batchAdd = async () => {
    if (selected.length === 0) return;
    for (const d of selected) {
      await setActivity(d, { title: form.title || "通常活動", time: form.time, memo: form.memo });
    }
    setMessage(`${selected.length}日分の活動日を登録しました`);
    setSelected([]);
    setTimeout(() => setMessage(""), 3000);
  };

  const batchDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`${selected.length}日分の活動日を削除しますか？`)) return;
    for (const d of selected) {
      await deleteActivity(d);
    }
    setMessage(`${selected.length}日分の活動日を削除しました`);
    setSelected([]);
    setTimeout(() => setMessage(""), 3000);
  };

  const selectAllSaturdays = () => {
    const sats = days.filter((d) => d && new Date(d + "T00:00:00").getDay() === 6) as string[];
    setSelected((prev) => {
      const allSelected = sats.every((s) => prev.includes(s));
      if (allSelected) return prev.filter((d) => !sats.includes(d));
      return [...new Set([...prev, ...sats])];
    });
  };

  const selectAllSundays = () => {
    const suns = days.filter((d) => d && new Date(d + "T00:00:00").getDay() === 0) as string[];
    setSelected((prev) => {
      const allSelected = suns.every((s) => prev.includes(s));
      if (allSelected) return prev.filter((d) => !suns.includes(d));
      return [...new Set([...prev, ...suns])];
    });
  };

  const clearSelection = () => setSelected([]);

  return (
    <div className="page">
      <h2 className="page-title">📅 活動日管理</h2>

      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => { setMode("add"); setSelected([]); }}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer",
              background: mode === "add" ? "#0f172a" : "#f1f5f9",
              color: mode === "add" ? "#fff" : "#334155",
              fontWeight: 700, fontSize: 13, fontFamily: "inherit",
            }}
          >＋ 追加モード</button>
          <button
            onClick={() => { setMode("delete"); setSelected([]); }}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer",
              background: mode === "delete" ? "#ef4444" : "#f1f5f9",
              color: mode === "delete" ? "#fff" : "#334155",
              fontWeight: 700, fontSize: 13, fontFamily: "inherit",
            }}
          >🗑 削除モード</button>
        </div>

        {mode === "add" && (
          <div className="flex-col" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>① 内容を入力</div>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="活動タイトル" className="input" />
            <input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="時間（例: 9:00〜12:30）" className="input" />
            <input value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="メモ（任意）" className="input" />
          </div>
        )}

        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>
          {mode === "add" ? "② カレンダーから日付を選択（複数可）" : "削除する活動日を選択"}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <button onClick={selectAllSaturdays} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
            土曜を全選択
          </button>
          <button onClick={selectAllSundays} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
            日曜を全選択
          </button>
          {selected.length > 0 && (
            <button onClick={clearSelection} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12, color: "#ef4444", fontFamily: "inherit" }}>
              選択解除
            </button>
          )}
        </div>

        <div className="flex-between mb-4">
          <button onClick={prev} className="month-btn">◀</button>
          <span className="fw-700" style={{ fontSize: 16 }}>{viewDate.y}年{viewDate.m + 1}月</span>
          <button onClick={next} className="month-btn">▶</button>
        </div>
        <div className="cal-grid">
          {"日月火水木金土".split("").map((d) => (
            <div key={d} className="cal-header">{d}</div>
          ))}
          {days.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const act = activities[d];
            const isSel = selected.includes(d);
            const isToday = d === today;

            return (
              <button key={d} onClick={() => toggleDate(d)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                  padding: "8px 2px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                  fontFamily: "inherit",
                  background: isSel ? (mode === "delete" ? "#fecaca" : "#bfdbfe") : act ? "#dcfce7" : "transparent",
                  color: "#334155",
                  border: isToday ? "2px solid #2563eb" : isSel ? `2px solid ${mode === "delete" ? "#ef4444" : "#2563eb"}` : "1px solid transparent",
                  fontWeight: isToday ? 800 : 500,
                }}>
                <span>{parseInt(d.split("-")[2])}</span>
                {act && <span style={{ fontSize: 6, color: "#22c55e" }}>●</span>}
                {isSel && <span style={{ fontSize: 8, color: mode === "delete" ? "#ef4444" : "#2563eb" }}>✓</span>}
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
              {selected.length}日選択中: {selected.sort().map((d) => formatDate(d)).join("、")}
            </div>
            {mode === "add" ? (
              <button onClick={batchAdd} className="btn-primary">
                {selected.length}日分を一括登録
              </button>
            ) : (
              <button onClick={batchDelete} className="btn-primary btn-danger">
                {selected.length}日分を一括削除
              </button>
            )}
          </div>
        )}

        {message && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#dcfce7", color: "#059669", fontSize: 13, fontWeight: 600 }}>
            ✓ {message}
          </div>
        )}
      </div>

      <div className="card">
        <div className="fw-700 mb-3">登録済みの活動日</div>
        {Object.keys(activities).sort().filter((d) => d >= today).length === 0 ? (
          <div className="text-hint text-sm">今後の活動日はまだありません</div>
        ) : (
          Object.keys(activities).sort().filter((d) => d >= today).map((d) => (
            <div key={d} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(d)} — {activities[d].title || "通常活動"}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{activities[d].time}{activities[d].memo ? ` / ${activities[d].memo}` : ""}</div>
              </div>
              <button onClick={async () => { await deleteActivity(d); }} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#ef4444" }}>🗑</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Dashboard({ members, activities, reservations, checkins }: {
  members: Member[]; activities: Record<string, Activity>; reservations: Record<string, string[]>; checkins: Record<string, Record<string, CheckinRecord>>;
}) {
  const t = todayStr();
  const allD = Object.keys(activities).filter((d) => d <= t).sort();
  const stats = members.map((m) => {
    let att = 0, min = 0;
    allD.forEach((d) => { const dc = checkins[d] || {}; if (dc[m.id]?.inTime) { att++; if (dc[m.id].outTime) min += diffMinutes(dc[m.id].inTime, dc[m.id].outTime); } });
    return { ...m, att, min, rate: allD.length ? Math.round((att / allD.length) * 100) : 0 };
  }).sort((a, b) => b.rate - a.rate || b.min - a.min);

  return (
    <div className="page">
      <h2 className="page-title">📊 ダッシュボード</h2>
      <div className="grid-3 mb-4">
        <div className="stat-card"><div className="stat-value">{allD.length}</div><div className="stat-label">活動日数</div></div>
        <div className="stat-card"><div className="stat-value">{members.length}</div><div className="stat-label">部員数</div></div>
        <div className="stat-card"><div className="stat-value">{allD.length ? Math.round(stats.reduce((s, m) => s + m.rate, 0) / members.length) : 0}%</div><div className="stat-label">平均出席率</div></div>
      </div>
      <div className="card">
        <div className="fw-700 mb-3">出席ランキング</div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead><tr>
              <th>#</th><th style={{ textAlign: "left" }}>名前</th><th>学年</th><th>出席率</th><th>参加</th><th>時間</th>
            </tr></thead>
            <tbody>{stats.map((s, i) => (
              <tr key={s.id}>
                <td>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                <td style={{ textAlign: "left", fontWeight: 600 }}>{s.name}{s.role && <span style={{ fontSize: 10, color: "#f59e0b", marginLeft: 4 }}>{s.role}</span>}</td>
                <td><span className="grade-badge" style={{ background: GB[s.grade], color: GC[s.grade], fontSize: 10, padding: "1px 6px" }}>{s.grade}年</span></td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <div className="progress-bar" style={{ width: 36 }}>
                      <div className="progress-fill" style={{ width: `${s.rate}%`, background: s.rate >= 80 ? "#22c55e" : s.rate >= 50 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                    <span>{s.rate}%</span>
                  </div>
                </td>
                <td>{s.att}</td>
                <td>{Math.round(s.min / 60 * 10) / 10}h</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MemMgr({ members }: { members: Member[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", grade: 1, role: "" });

  const startEdit = (m: Member) => { setEditing(m.id); setForm({ name: m.name, grade: m.grade, role: m.role }); setAdding(false); };
  const save = async () => {
    if (!form.name) return;
    if (adding) {
      await addMember({ name: form.name, grade: form.grade, role: form.role });
      setAdding(false);
    } else if (editing) {
      await updateMember({ id: editing, name: form.name, grade: form.grade, role: form.role });
      setEditing(null);
    }
    setForm({ name: "", grade: 1, role: "" });
  };
  const del = async (id: string) => { if (confirm("削除しますか？")) await deleteMember(id); };

  const groups = [3, 2, 1].map((g) => ({ g, list: members.filter((m) => m.grade === g) })).filter((x) => x.list.length);

  return (
    <div className="page">
      <h2 className="page-title">👥 部員管理</h2>
      {(editing || adding) && (
        <div className="card">
          <div className="text-sm fw-700 mb-3">{adding ? "部員を追加" : "部員を編集"}</div>
          <div className="flex-col">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="名前" className="input" />
            <select value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })} className="input">
              <option value={1}>1年生</option><option value={2}>2年生</option><option value={3}>3年生</option>
            </select>
            <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="役職（任意）" className="input" />
            <div className="flex-row">
              <button onClick={save} className="btn-primary" style={{ flex: 1 }}>保存</button>
              <button onClick={() => { setEditing(null); setAdding(false); }} className="btn-secondary">キャンセル</button>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => { setAdding(true); setEditing(null); setForm({ name: "", grade: 1, role: "" }); }} className="btn-primary mb-4">＋ 部員を追加</button>
      {groups.map(({ g, list }) => (
        <div key={g} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: GC[g], marginBottom: 6 }}>{g}年生 ({list.length}人)</div>
          {list.map((m) => (
            <div key={m.id} className="member-row" style={{ padding: "10px 0" }}>
              <span className="avatar" style={{ background: GB[m.grade], color: GC[m.grade] }}>{m.name[0]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                {m.role && <div style={{ fontSize: 11, color: "#f59e0b" }}>{m.role}</div>}
              </div>
              <button onClick={() => startEdit(m)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer" }}>✏️</button>
              <button onClick={() => del(m.id)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer" }}>🗑️</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function AnnMgr({ announcements }: { announcements: Announcement[] }) {
  const [form, setForm] = useState({ title: "", body: "" });
  const add = async () => {
    if (!form.title) return;
    await addAnnouncement({ title: form.title, body: form.body, date: formatDate(todayStr()) });
    setForm({ title: "", body: "" });
  };
  const del = async (id: string) => await deleteAnnouncement(id);

  return (
    <div className="page">
      <h2 className="page-title">📢 お知らせ管理</h2>
      <div className="card">
        <div className="flex-col">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="タイトル" className="input" />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="本文（任意）" rows={3} className="input" style={{ resize: "vertical" }} />
          <button onClick={add} className="btn-primary">お知らせを追加</button>
        </div>
      </div>
      {announcements.map((a) => (
        <div key={a.id} className="card">
          <div className="flex-between">
            <div>
              <div className="fw-700">{a.title}</div>
              <div className="text-xs text-hint">{a.date}</div>
              {a.body && <div className="text-xs text-muted" style={{ marginTop: 4 }}>{a.body}</div>}
            </div>
            <button onClick={() => del(a.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
        </div>
      ))}
    </div>
  );
}
