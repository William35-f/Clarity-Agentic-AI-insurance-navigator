import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const activityLabels = {
  FOLLOW_UP_UPDATED: "Task updated",
  EMAIL_DRAFT_GENERATED: "Email drafted",
  DEMO_EMAIL_SENT: "Email sent",
  MEETING_APPROVED: "Meeting approved"
};

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit"
  }).format(date);
}

function AdvisorActivityLog() {
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch("http://localhost:5000/api/advisor/activities", {
          headers: { "x-demo-role": "advisor" }
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Failed to load activities.");
        setActivities(data.data || []);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const visibleActivities = useMemo(() => {
    if (filter === "all") return activities;
    if (filter === "email") return activities.filter((item) => item.activity_type.includes("EMAIL"));
    return activities.filter((item) => item.activity_type === "FOLLOW_UP_UPDATED");
  }, [activities, filter]);

  return (
    <main className="app-page activity-log-page">
      <header className="page-header follow-up-agent-header">
        <div>
          <div className="view-badge">Advisor View</div>
          <p className="page-kicker">Clarity audit trail</p>
          <h1>Activity Log</h1>
          <p className="lead">Review the actions completed by the advisor and Follow-up Agent.</p>
        </div>
        <Link className="btn" to="/advisor-dashboard">Back to Meeting Manager</Link>
      </header>

      <section className="card activity-log-card">
        <div className="advisor-panel-heading">
          <div><p className="page-kicker">Recorded actions</p><h2>Recent activity</h2></div>
          <div className="advisor-schedule-filters follow-up-filters">
            {[['all', 'All'], ['email', 'Emails'], ['tasks', 'Tasks']].map(([value, label]) => (
              <button className={filter === value ? "advisor-filter--active" : ""} type="button" key={value} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
        </div>
        {error && <div className="alert">{error}</div>}
        {loading && <p className="muted">Loading activity...</p>}
        {!loading && visibleActivities.length === 0 && <div className="advisor-empty-state"><h3>No recorded activity</h3><p className="muted">Follow-up actions will appear here.</p></div>}
        <div className="activity-timeline">
          {visibleActivities.map((activity) => (
            <article className="activity-entry" key={activity.activity_id}>
              <span className={`activity-dot activity-dot--${activity.activity_type.toLowerCase()}`} />
              <div>
                <div className="activity-entry-heading">
                  <strong>{activity.title}</strong>
                  <span className="tag">{activityLabels[activity.activity_type] || activity.activity_type}</span>
                </div>
                <p>{activity.details}</p>
                <small>{formatDateTime(activity.created_at)} · {activity.advisor_name || "Advisor"}{activity.customer_name ? ` · ${activity.customer_name}` : ""}</small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default AdvisorActivityLog;
