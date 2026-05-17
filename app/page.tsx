"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { initLiff, isInLiff } from "@/lib/liff";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    initLiff();
  }, []);

  const select = (role: string) => {
    router.push(`/${role}`);
  };

  return (
    <div className="role-screen">
      <div className="role-card">
        <div style={{ fontSize: 56, marginBottom: 12 }}>🤖</div>
        <h1 className="role-title">水中ロボット部</h1>
        <p className="role-subtitle">活動管理システム</p>
        <div className="flex-col">
          <button onClick={() => select("student")} className="role-btn">
            <span style={{ fontSize: 32 }}>🎒</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>部員</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>予約・マイページ</span>
          </button>
          <button onClick={() => select("teacher")} className="role-btn">
            <span style={{ fontSize: 32 }}>👨‍🏫</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>顧問</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>管理・ダッシュボード</span>
          </button>
          <button onClick={() => select("ipad")} className="role-btn">
            <span style={{ fontSize: 32 }}>📱</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>iPad端末</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>入退室チェック</span>
          </button>
        </div>
      </div>
    </div>
  );
}
