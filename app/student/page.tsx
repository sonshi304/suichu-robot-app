"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import Calendar from "@/components/Calendar";
import {
  getMembers, getActivities, getReservations, getCheckins, getAnnouncements,
  toggleReservation, onActivitiesChange, onReservationsChange, onAnnouncementsChange,
  todayStr, formatDate, formatTime, diffMinutes,
  type Member, type Activity, type CheckinRecord, type Announcement,
} from "@/lib/firebase";

const GRADE_COLORS: Record<number, string> = { 3: "#2563eb", 2: "#8b5cf6", 1: "#f59e0b" };
const GRADE_BG: Record<number, string> = { 3: "#dbeafe", 2: "#ede9fe", 1: "#fef3c7" };

const NAV = [
  { id: "home", path: "/student?page=home", label: "ホーム", icon: "🏠" },
  { id: "reserve", path: "/student?page=reserve", label: "予約", icon: "📅" },
  { id: "who", path: "/student?page=who", label: "参加者", icon: "👥" },
  { id: "mypage", path: "/student?page=mypage", label: "マイページ", icon: "👤" },
];

export default function StudentPageWrapper() {
  return (
    <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
      <StudentPage />
    </Suspense>
  );
}

function StudentPage() {
  const searchParams = useSearchParams();
  const page = searchParams.get("page") || "home";
  const [user, setUser] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Record<string, Activity>>({});
  const [reservations, setReservations] = useState<Record<string, string[]>>({});
  const [checkins, setCheckins] = useState<Record<string, Record<string, CheckinRecord>>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setMembers(await getMembers());
      setCheckins(await getCheckins());
      setLoading(false);
    })();
    const unsub1 = onActivitiesChange(setActivities);
    const unsub2 = onReservationsChange(setReservations);
    const unsub3 = onAnnouncementsChange(setAnnouncements);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  if (!user) {
    const grouped = [3, 2, 1].map((g) => ({ grade: g, list: members.filter((m) => m.grade === g) })).filter((g) => g.list.length);
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 20 }}>
        <button onClick={() => router.push("/")} className="back-btn">← 戻る</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>名前を選んでください</h2>
        {grouped.map((g) => (
          <div key={g.grade} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: GRADE_COLORS[g.grade], marginBottom: 8 }}>{g.grade}年生</div>
            <div className="flex-col">
              {g.list.map((m) => (
                <button key={m.id} onClick={() => setUser(m)} className="login-btn">
                  <div className="grade-badge" style={{ background: GRADE_BG[m.grade], color: GRADE_COLORS[m.grade] }}>{m.grade}年</div>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</span>
                  {m.role && <span style={{ fontSize: 11, color: "#f59e0b", marginLeft: "auto" }}>{m.role}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <AppShell title="水中ロボット部" subtitle={user.name} navItems={NAV} activePage={page}>
      {page === "home" && <StudentHome user={user} activities={activities} reservations={reservations} members={members} announcements={announcements} />}
      {page === "reserve" && <Reserve user={user} activities={activities} reservations={reservations} members={members} />}
      {page === "who" && <Who activities={activities} reservations={reservations} members={members} />}
      {page === "mypage" && <MyPage user={user} activities={activities} reservations={reservations} checkins={checkins} />}
    </AppShell>
  );
}

function StudentHome({ user, activities, reservations, members, announcements }: {
  user: Member; activities: Record<string, Activity>; reservations: Record<string, string[]>; members: Member[]; announcements: Announcement[];
}) {
  const t = todayStr();
  const tAct = activities[t];
  const tRes = reservations[t] || [];
  const myR = tRes.includes(user.id);
  const router = useRouter();

  return (
    <div className="page">
      <div className="mb-4">
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>👋 {user.name}</h2>
        <p className="text-muted text-sm" style={{ marginTop: 4 }}>{formatDate(t)}{user.role && ` ・ ${user.role}`}</p>
      </div>
      <div className="card" style={{ background: tAct ? "linear-gradient(135deg,#ecfdf5,#d1fae5)" : undefined }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: tAct ? "#059669" : "#94a3b8", marginBottom: 6 }}>📅 今日の活動</div>
        {tAct ? (<>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{tAct.title || "通常活動"}</div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>{tAct.time || "放課後"}</div>
          <div className="text-sm" style={{ marginTop: 8 }}>
            参加予定: <strong>{tRes.length}人</strong>/{members.length}人
            {myR && <span className="chip" style={{ background: "#dcfce7", color: "#059669", marginLeft: 8, fontWeight: 600, fontSize: 11 }}>予約済 ✓</span>}
          </div>
        </>) : (<div className="text-sm text-hint">今日の活動はありません</div>)}
      </div>
      {announcements.slice(0, 2).map((a) => (
        <div key={a.id} className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>📢 {a.title}</div>
          <div className="text-xs text-hint">{a.date}</div>
        </div>
      ))}
      <div className="grid-2">
        <button onClick={() => router.push("/student?page=reserve")} className="quick-btn"><span className="icon">📅</span><span className="label">予約する</span></button>
        <button onClick={() => router.push("/student?page=who")} className="quick-btn"><span className="icon">👥</span><span className="label">参加者</span></button>
      </div>
    </div>
  );
}

function Reserve({ user, activities, reservations, members }: {
  user: Member; activities: Record<string, Activity>; reservations: Record<string, string[]>; members: Member[];
}) {
  const [sel, setSel] = useState<string | null>(null);
  const dRes = sel ? (reservations[sel] || []) : [];
  const isR = sel ? dRes.includes(user.id) : false;

  const toggle = async () => {
    if (!sel) return;
    await toggleReservation(sel, user.id);
  };

  return (
    <div className="page">
      <h2 className="page-title">📅 予約カレンダー</h2>
      <Calendar activities={activities} reservations={reservations} userId={user.id} selectedDay={sel} onSelectDay={setSel} />
      {sel && (
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{formatDate(sel)}</div>
          {activities[sel] ? (<>
            <div className="text-sm text-green fw-700" style={{ marginBottom: 4 }}>✓ 活動日 — {activities[sel].title || "通常活動"}</div>
            <div className="text-xs text-muted mb-3">{activities[sel].time || "放課後"}{activities[sel].memo ? ` / ${activities[sel].memo}` : ""}</div>
            <button onClick={toggle} className={`btn-primary ${isR ? "btn-danger" : ""}`}>
              {isR ? "予約をキャンセル" : "参加を予約する"}
            </button>
            {dRes.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="text-xs text-muted mb-2">参加予定 ({dRes.length}人)</div>
                <div className="flex-wrap">
                  {dRes.map((id) => {
                    const m = members.find((x) => x.id === id);
                    return m ? (
                      <span key={id} className="chip" style={{
                        background: id === user.id ? GRADE_BG[m.grade] : "#f1f5f9",
                        color: id === user.id ? GRADE_COLORS[m.grade] : "#334155"
                      }}>{m.name}</span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </>) : (<div className="text-sm text-hint">この日は活動がありません</div>)}
        </div>
      )}
    </div>
  );
}

function Who({ activities, reservations, members }: {
  activities: Record<string, Activity>; reservations: Record<string, string[]>; members: Member[];
}) {
  const t = todayStr();
  const upcoming = Object.keys(activities).filter((d) => d >= t).sort().slice(0, 7);
 const [sel, setSel] = useState<string>(upcoming[0] || t);

  // Update sel if upcoming changes and current sel is not in the list
  useEffect(() => {
    if (upcoming.length > 0 && !upcoming.includes(sel)) {
      setSel(upcoming[0]);
    }
  }, [upcoming.join(",")]);

  const dr = reservations[sel] || [];

  return (
    <div className="page">
      <h2 className="page-title">👥 参加予定メンバー</h2>
      <div className="date-tabs">
        {upcoming.map((d) => (
          <button key={d} onClick={() => setSel(d)} className={`date-tab ${sel === d ? "active" : ""}`}>{formatDate(d)}</button>
        ))}
        {upcoming.length === 0 && <div className="text-sm text-hint">予定されている活動日がありません</div>}
      </div>
      {activities[sel] && (
        <div className="card">
          <div className="fw-700 mb-2">{formatDate(sel)} — {activities[sel]?.title || "通常活動"}</div>
          <div className="text-xs text-muted mb-4">参加予定: {dr.length}人 / {members.length}人</div>
          {dr.length > 0 ? (
            <div className="flex-col" style={{ gap: 6 }}>
              {dr.map((id) => {
                const m = members.find((x) => x.id === id);
                return m ? (
                  <div key={id} className="member-row">
                    <span className="avatar" style={{ background: GRADE_BG[m.grade], color: GRADE_COLORS[m.grade] }}>{m.name[0]}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                      <div className="text-xs text-hint">{m.grade}年{m.role && ` ・ ${m.role}`}</div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          ) : (<div className="text-hint text-sm text-center" style={{ padding: 20 }}>まだ予約がありません</div>)}
        </div>
      )}
    </div>
  );
}

function MyPage({ user, activities, reservations, checkins }: {
  user: Member; activities: Record<string, Activity>; reservations: Record<string, string[]>; checkins: Record<string, Record<string, CheckinRecord>>;
}) {
  const t = todayStr();
  const allD = Object.keys(activities).filter((d) => d <= t).sort();
  let attended = 0, totalMin = 0, streak = 0;
  const myLog: { date: string; inTime: string | null; outTime: string | null; min: number }[] = [];

  allD.forEach((d) => {
    const dc = checkins[d] || {};
    const m = dc[user.id];
    if (m?.inTime) {
      attended++;
      const mn = m.outTime ? diffMinutes(m.inTime, m.outTime) : 0;
      totalMin += mn;
      myLog.push({ date: d, ...m, min: mn });
    }
  });
  for (const d of [...allD].reverse()) {
    const dc = checkins[d] || {};
    if (dc[user.id]?.inTime) streak++;
    else break;
  }
  const rate = allD.length ? Math.round((attended / allD.length) * 100) : 0;
  const upRes = Object.keys(reservations).filter((d) => d >= t && reservations[d]?.includes(user.id)).sort();

  return (
    <div className="page">
      <h2 className="page-title">👤 マイページ</h2>
      <div className="card" style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", color: "#fff" }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{user.name}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{user.grade}年生{user.role && ` ・ ${user.role}`}</div>
      </div>
      <div className="grid-2">
        <div className="stat-card"><div className="stat-value">{rate}%</div><div className="stat-label">出席率</div></div>
        <div className="stat-card"><div className="stat-value">{attended}</div><div className="stat-label">参加回数</div></div>
        <div className="stat-card"><div className="stat-value">{Math.round(totalMin / 60 * 10) / 10}h</div><div className="stat-label">累計活動時間</div></div>
        <div className="stat-card"><div className="stat-value">{streak}回</div><div className="stat-label">連続参加</div></div>
      </div>
      {upRes.length > 0 && (
        <div className="card">
          <div className="text-sm fw-700 mb-2">📅 予約中</div>
          {upRes.map((d) => (
            <div key={d} style={{ padding: "6px 0", fontSize: 13, borderBottom: "1px solid #f1f5f9" }}>
              {formatDate(d)} — {activities[d]?.title || "通常活動"}
            </div>
          ))}
        </div>
      )}
      {myLog.length > 0 && (
        <div className="card">
          <div className="text-sm fw-700 mb-2">📋 最近の記録</div>
          {myLog.slice(-5).reverse().map((c, i) => (
            <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span>{formatDate(c.date)}</span>
              <span>{formatTime(c.inTime)} 〜 {formatTime(c.outTime)}</span>
              <span className="text-green fw-700">{c.min}分</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
