import TabBar from "./TabBar";

/** Shell for every client screen: logo bar on top, five tabs along the bottom. */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <header className="topbar">
        <img src="/icons/logo.png" alt="" />
        <span className="brand">Vital Fusion Coaching</span>
      </header>
      <main className="page" style={{ paddingTop: 8 }}>
        {children}
      </main>
      <TabBar />
    </div>
  );
}
