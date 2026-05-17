"use client";

import { useState } from "react";
import { todayStr, type Activity } from "@/lib/firebase";

function getMonthDays(y: number, m: number): (string | null)[] {
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const days: (string | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++)
    days.push(
      `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );
  return days;
}

export default function Calendar({
  activities,
  reservations,
  userId,
  selectedDay,
  onSelectDay,
}: {
  activities: Record<string, Activity>;
  reservations?: Record<string, string[]>;
  userId?: string;
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
}) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const days = getMonthDays(viewDate.y, viewDate.m);
  const today = todayStr();

  const prev = () =>
    setViewDate((v) =>
      v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 }
    );
  const next = () =>
    setViewDate((v) =>
      v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 }
    );

  return (
    <div className="card">
      <div className="flex-between mb-4">
        <button onClick={prev} className="month-btn">◀</button>
        <span className="fw-700" style={{ fontSize: 16 }}>
          {viewDate.y}年{viewDate.m + 1}月
        </span>
        <button onClick={next} className="month-btn">▶</button>
      </div>
      <div className="cal-grid">
        {"日月火水木金土".split("").map((d) => (
          <div key={d} className="cal-header">{d}</div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const act = activities[d];
          const res = reservations?.[d] || [];
          const isMine = userId ? res.includes(userId) : false;
          const isToday = d === today;
          const isSelected = d === selectedDay;

          let cls = "cal-day";
          if (isSelected) cls += " selected";
          else if (act) cls += " active";
          if (isToday) cls += " today";

          return (
            <button key={d} onClick={() => onSelectDay(d)} className={cls}>
              <span>{parseInt(d.split("-")[2])}</span>
              {act && (
                <span style={{ fontSize: 6, color: isSelected ? "#86efac" : "#22c55e" }}>●</span>
              )}
              {isMine && (
                <span style={{ fontSize: 8, color: isSelected ? "#fbbf24" : "#f59e0b" }}>★</span>
              )}
              {res.length > 0 && (
                <span style={{ fontSize: 8, color: isSelected ? "#93c5fd" : "#64748b" }}>
                  {res.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
