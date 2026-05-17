"use client";

import { useRouter } from "next/navigation";

type NavItem = { id: string; path: string; label: string; icon: string };

export default function AppShell({
  title,
  subtitle,
  navItems,
  activePage,
  children,
}: {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  activePage: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="header-logo">🤖</span>
            <div>
              <div className="header-title">{title}</div>
              <div className="header-sub">{subtitle}</div>
            </div>
          </div>
          <button onClick={() => router.push("/")} className="logout-btn">
            切替
          </button>
        </div>
      </header>
      <main className="main">{children}</main>
      <nav className="nav">
        {navItems.map((n) => (
          <button
            key={n.id}
            onClick={() => router.push(n.path)}
            className={`nav-btn ${activePage === n.id ? "active" : ""}`}
          >
            <span className="icon">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
