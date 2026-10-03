import { Link, Outlet, ScrollRestoration } from "react-router-dom";

export default function Layout() {
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">暗黑不朽配裝匯總</Link>
      </header>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
