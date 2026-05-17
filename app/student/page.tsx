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
