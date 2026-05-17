"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  getMembers, checkIn, onCheckinsChange,
  todayStr, formatDate, formatTime, diffMinutes,
  type Member, type CheckinRecord,
} from "@/lib/firebase";

const GC: Record<number, string> = { 3: "#2563eb", 2: "#8b5cf6", 1: "#f59e0b" };
const GB: Record<number, string> = { 3: "#dbeafe", 2: "#ede9fe", 1: "#fef3c7" };

const NAV = [
  { id: "checkin", path: "/ipad?page=checkin", label: "チェックイン", icon: "🚪" },
  { id: "status", path: "/ipad?page=status", label: "在室状況", icon: "👥" },
];

export default function IPadPageWrapper() {
  return (
    <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
      <IPadPage />
    </Suspense>
  );
}

function IPadPage() {
  const searchParams = useSearchParams();
  const page = searchParams.get("page") || "checkin";
  const [members, setMembers] = useState<Member[]>([]);
  const [dayCheckins, setDayCheckins] = useState<Record<string, CheckinRecord>>({});
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<{ name: string; action: string; color: string } | null>(null);
  const today = todayStr();

  useEffect(() => {
    (async () => {
      setMembers(await getMembers());
      setLoading(false);
    })();
    const unsub = onCheckinsChange(today, setDayCheckins);
    return () => unsub();
  }, [today]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const handleTap = async (member: Member) => {
    const action = await checkIn(today, member.id);
    setFlash({
      name: member.name,
      action: action === "in" ? "IN" : "OUT",
      color: action === "in" ? "#22c55e" : "#ef4444",
    });
    setTimeout(() => setFlash(null), 1200);
  };

  const getStatus = (id: string): "out" | "in" | "done" => {
    const c = dayCheckins[id];
    if (!c?.inTime) return "out";
    if (c.inTime && !c.outTime) return "in";
    return "done";
  };

  return (
    <AppShell title="水中ロボット部" subtitle="入退室端末" navItems={NAV} activePage={page}>
      {flash && (
        <div className="flash-overlay" style={{ background: flash.color }}>
          <div style={{ fontSize: 56, fontWeight: 900 }}>{flash.action}</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{flash.name}</div>
        </div>
      )}

      {page === "checkin" && (
        <CheckInView members={members} dayCheckins={dayCheckins} onTap={handleTap} getStatus={getStatus} />
      )}
      {page === "status" && (
        <StatusView members={members} dayCheckins={dayCheckins} getStatus={getStatus} />
      )}
    </AppShell>
  );
}

function CheckInView({ members, dayCheckins, onTap, getStatus }: {
  members: Member[];
  dayCheckins: Record<string, CheckinRecord>;
  onTap: (m: Member) => void;
  getStatus: (id: string) => "out" | "in" | "done";
}) {
  const inCount = members.filter((m) => getStatus(m.id) === "in").length;
  const groups = [3, 2, 1].map((g) => ({ g, list: members.filter((m) => m.grade === g) })).filter((x) => x.list.length);

  return (
    <div className="page">
      <div className="flex-between mb-4">
        <h2 className="page-title" style={{ margin: 0 }}>🚪 チェックイン</h2>
        <div className="fw-700 text-green">在室 {inCount}人</div>
      </div>
      {groups.map(({ g, list }) => (
        <div key={g} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: GC[g], marginBottom: 6 }}>{g}年生</div>
          <div className="checkin-grid">
            {list.map((m) => {
              const st = getStatus(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => onTap(m)}
                  className={`checkin-btn ${st}`}
                >
                  <span
                    className="status-badge"
                    style={{
                      background: st === "in" ? "#22c55e" : st === "done" ? "#94a3b8" : "#cbd5e1",
                    }}
                  >
                    {st === "in" ? "在室" : st === "done" ? "退室済" : "未到着"}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{m.name}</span>
                  {st !== "out" && (
                    <span className="text-xs text-muted">
                      {formatTime(dayCheckins[m.id]?.inTime)}
                      {dayCheckins[m.id]?.outTime && ` 〜 ${formatTime(dayCheckins[m.id]?.outTime)}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusView({ members, dayCheckins, getStatus }: {
  members: Member[];
  dayCheckins: Record<string, CheckinRecord>;
  getStatus: (id: string) => "out" | "in" | "done";
}) {
  const inM = members.filter((m) => getStatus(m.id) === "in");
  const doneM = members.filter((m) => getStatus(m.id) === "done");

  return (
    <div className="page">
      <h2 className="page-title">👥 在室状況</h2>
      <div className="card" style={{ background: "linear-gradient(135deg,#ecfdf5,#d1fae5)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>現在の在室者</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: "#059669" }}>
          {inM.length}<span style={{ fontSize: 16 }}>人</span>
        </div>
      </div>
      {inM.length > 0 && (
        <div className="card">
          <div className="text-sm fw-700 text-green mb-3">🟢 在室中</div>
          {inM.map((m) => (
            <div key={m.id} className="member-row">
              <span className="avatar" style={{ background: GB[m.grade], color: GC[m.grade] }}>{m.name[0]}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                <div className="text-xs text-hint">{m.grade}年</div>
              </div>
              <span className="text-xs text-muted" style={{ marginLeft: "auto" }}>
                {formatTime(dayCheckins[m.id]?.inTime)} 〜
              </span>
            </div>
          ))}
        </div>
      )}
      {doneM.length > 0 && (
        <div className="card">
          <div className="text-sm fw-700 text-hint mb-3">⚪ 退室済み</div>
          {doneM.map((m) => (
            <div key={m.id} className="member-row" style={{ opacity: 0.6 }}>
              <span className="avatar">{m.name[0]}</span>
              <span style={{ fontSize: 14 }}>{m.name}</span>
              <span className="text-xs text-muted" style={{ marginLeft: "auto" }}>
                {formatTime(dayCheckins[m.id]?.inTime)} 〜 {formatTime(dayCheckins[m.id]?.outTime)}
                ({diffMinutes(dayCheckins[m.id]?.inTime, dayCheckins[m.id]?.outTime)}分)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
