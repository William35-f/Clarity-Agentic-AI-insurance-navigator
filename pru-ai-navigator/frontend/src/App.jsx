import { useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";

import CustomerProfile from "./pages/customerprofile";
import DocumentChat from "./pages/DocumentChat";
import CustomerSummary from "./pages/CustomerSummary";
import BookMeeting from "./pages/BookMeeting";
import AdvisorDashboard from "./pages/AdvisorDashboard";
import AdvisorMeetingAssistant from "./pages/AdvisorMeetingAssistant";

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
                <Link to="/advisor-dashboard">Advisor Dashboard</Link>
                <Link to="/advisor/meeting-assistant">Meeting Assistant</Link>
              </>
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
      </Routes>

      <footer className="app-footer">Clarity by Aspire</footer>
    </div>
  );
}

export default App;
