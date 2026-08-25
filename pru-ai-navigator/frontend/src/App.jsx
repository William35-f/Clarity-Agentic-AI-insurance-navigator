import { useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import CustomerProfile from "./pages/customerprofile";
import DocumentChat from "./pages/DocumentChat";
import CustomerSummary from "./pages/CustomerSummary";
import BookMeeting from "./pages/BookMeeting";
import AdvisorDashboard from "./pages/AdvisorDashboard";
import AdvisorMeetingAssistant from "./pages/AdvisorMeetingAssistant";
import AdvisorFollowUpAgent from "./pages/AdvisorFollowUpAgent";
import AdvisorActivityLog from "./pages/AdvisorActivityLog";

function DemoRoleGate({ allowedRole, currentRole, children }) {
  if (currentRole !== allowedRole) {
    return (
      <main className="app-page app-page--narrow">
        <section className="card">
          <div className="view-badge">
            {allowedRole === "advisor" ? "Advisor View" : "Customer View"}
          </div>
          <h1>Switch demo role</h1>
          <p className="lead">
            This page is available in the {allowedRole} demo role. Use the role
            selector in the header to continue.
          </p>
        </section>
      </main>
    );
  }

  return children;
}

function navLinkClass({ isActive }) {
  return isActive ? "app-nav-link app-nav-link--active" : "app-nav-link";
}

function App() {
  const [demoRole, setDemoRole] = useState(() => {
    return localStorage.getItem("demo_role") || "customer";
  });

  function updateDemoRole(role) {
    localStorage.setItem("demo_role", role);
    setDemoRole(role);
  }

  return (
    <div className="app-shell">
      <header className="app-navbar">
        <div className="navbar-inner">
          <img className="brand-logo" src="/clarity-logo.svg" alt="Clarity" />
          {demoRole === "advisor" && (
            <nav className="app-nav" aria-label="Primary navigation">
              <>
                <NavLink className={navLinkClass} end to="/advisor-dashboard">Meeting Manager</NavLink>
                <NavLink className={navLinkClass} to="/advisor/meeting-assistant">Meeting Assistant</NavLink>
                <NavLink className={navLinkClass} to="/advisor/follow-up">Follow-up Agent</NavLink>
                <NavLink className={navLinkClass} to="/advisor/activity">Activity Log</NavLink>
              </>
            </nav>
          )}
          {demoRole === "customer" && (
            <nav className="app-nav" aria-label="Primary navigation">
              <NavLink className={navLinkClass} to="/customer-profile">Customer Journey</NavLink>
            </nav>
          )}
          <div className="role-switcher" aria-label="Demo role selector">
            <button
              className={`role-pill ${demoRole === "customer" ? "role-pill--active" : ""}`}
              type="button"
              onClick={() => updateDemoRole("customer")}
            >
              Customer
            </button>
            <button
              className={`role-pill ${demoRole === "advisor" ? "role-pill--active" : ""}`}
              type="button"
              onClick={() => updateDemoRole("advisor")}
            >
              Advisor
            </button>
          </div>
        </div>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to={
                demoRole === "advisor"
                  ? "/advisor-dashboard"
                  : "/customer-profile"
              }
            />
          }
        />
        <Route
          path="/customer-profile"
          element={
            <DemoRoleGate allowedRole="customer" currentRole={demoRole}>
              <CustomerProfile />
            </DemoRoleGate>
          }
        />
        <Route
          path="/document-chat"
          element={
            <DemoRoleGate allowedRole="customer" currentRole={demoRole}>
              <DocumentChat />
            </DemoRoleGate>
          }
        />
        <Route
          path="/customer-summary"
          element={
            <DemoRoleGate allowedRole="customer" currentRole={demoRole}>
              <CustomerSummary />
            </DemoRoleGate>
          }
        />
        <Route
          path="/book-meeting"
          element={
            <DemoRoleGate allowedRole="customer" currentRole={demoRole}>
              <BookMeeting />
            </DemoRoleGate>
          }
        />
        <Route
          path="/advisor-dashboard"
          element={
            <DemoRoleGate allowedRole="advisor" currentRole={demoRole}>
              <AdvisorDashboard />
            </DemoRoleGate>
          }
        />
        <Route
          path="/advisor/meeting-assistant"
          element={
            <DemoRoleGate allowedRole="advisor" currentRole={demoRole}>
              <AdvisorMeetingAssistant />
            </DemoRoleGate>
          }
        />
        <Route
          path="/advisor/follow-up"
          element={
            <DemoRoleGate allowedRole="advisor" currentRole={demoRole}>
              <AdvisorFollowUpAgent />
            </DemoRoleGate>
          }
        />
        <Route
          path="/advisor/activity"
          element={
            <DemoRoleGate allowedRole="advisor" currentRole={demoRole}>
              <AdvisorActivityLog />
            </DemoRoleGate>
          }
        />
      </Routes>

      <footer className="app-footer">Clarity by Aspire</footer>
    </div>
  );
}

export default App;
