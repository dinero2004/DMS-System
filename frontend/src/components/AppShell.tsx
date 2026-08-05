import {
  BarChart3,
  Car,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  Menu,
  Wrench
} from "lucide-react";
import type React from "react";
import type { PageKey } from "../pages/pageTypes";

type AppShellProps = {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: React.ReactNode;
};

const navItems: Array<{ key: PageKey; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "vehicles", label: "Vehicles", icon: Car },
  { key: "valuation", label: "Valuation", icon: Gauge },
  { key: "protocols", label: "Protocols", icon: ClipboardList }
];

export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">
            <Wrench size={20} />
          </div>
          <div>
            <div className="brand-name">DMS Valuation</div>
            <div className="brand-subtitle">MVP backend console</div>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-button ${activePage === item.key ? "active" : ""}`}
                key={item.key}
                onClick={() => onNavigate(item.key)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" title="Menu" type="button">
            <Menu size={18} />
          </button>
          <div>
            <div className="eyebrow">Dealer Management System</div>
            <h1>{navItems.find((item) => item.key === activePage)?.label ?? "Dashboard"}</h1>
          </div>
          <div className="api-pill">
            <BarChart3 size={16} />
            <span>localhost:8080</span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
