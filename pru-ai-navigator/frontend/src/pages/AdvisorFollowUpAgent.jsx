import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit" }).format(date);
}

function AdvisorFollowUpAgent() {
  const [searchParams] = useSearchParams();
  const meetingIdFilter = searchParams.get("meeting_id") || "";
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [outreachDrafts, setOutreachDrafts] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadTasks() {
    try {
      const response = await fetch("http://localhost:5000/api/advisor/follow-up-tasks", {
        headers: { "x-demo-role": "advisor" }
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to load tasks.");
      setTasks(data.data || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(loadTasks, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const scopedTasks = useMemo(
    () => meetingIdFilter ? tasks.filter((task) => String(task.meeting_id) === meetingIdFilter) : tasks,
    [meetingIdFilter, tasks]
  );

  const stats = useMemo(() => ({
    open: scopedTasks.filter((task) => !task.completed).length,
    completed: scopedTasks.filter((task) => task.completed).length,
    customer: scopedTasks.filter((task) => !task.completed && task.owner === "Customer").length
  }), [scopedTasks]);

  const visibleTasks = useMemo(() => {
    if (filter === "all") return scopedTasks;
    if (filter === "completed") return scopedTasks.filter((task) => task.completed);
    return scopedTasks.filter((task) => !task.completed);
  }, [filter, scopedTasks]);

  const taskGroups = useMemo(() => {
    const groups = new Map();
    visibleTasks.forEach((task) => {
      const key = String(task.meeting_id);
      if (!groups.has(key)) groups.set(key, { ...task, tasks: [] });
      groups.get(key).tasks.push(task);
    });
    return [...groups.values()];
  }, [visibleTasks]);

  function editTask(recordId, taskIndex, field, value) {
    setTasks((items) => items.map((item) =>
      item.record_id === recordId && item.task_index === taskIndex
        ? { ...item, [field]: value }
        : item
    ));
    setMessage("");
  }

  async function saveTask(task) {
    const key = `${task.record_id}-${task.task_index}`;
    setSavingKey(key);
    setMessage("");
    try {
      const response = await fetch(
        `http://localhost:5000/api/advisor/follow-up-tasks/${task.record_id}/${task.task_index}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-demo-role": "advisor" },
          body: JSON.stringify({ task: task.task, owner: task.owner, completed: task.completed })
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to save task.");
      setMessage(`Follow-up for ${task.customer_name} saved.`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingKey("");
    }
  }

  async function generateMessage(task) {
    const key = `${task.record_id}-${task.task_index}`;
    setActionKey(`generate-${key}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `http://localhost:5000/api/advisor/follow-up-tasks/${task.record_id}/${task.task_index}/generate-message`,
        { method: "POST", headers: { "x-demo-role": "advisor" } }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to generate message.");
      setOutreachDrafts((drafts) => ({ ...drafts, [key]: { ...data.data, sent: false } }));
    } catch (generateError) {
      setError(generateError.message);
    } finally {
      setActionKey("");
    }
  }

  function editMessage(key, field, value) {
    setOutreachDrafts((drafts) => ({
      ...drafts,
      [key]: { ...drafts[key], [field]: value }
    }));
  }

  async function sendMessage(task) {
    const key = `${task.record_id}-${task.task_index}`;
    const draft = outreachDrafts[key];
    if (!draft) return;
    setActionKey(`send-${key}`);
    setError("");
    setMessage("");
    setOutreachDrafts((drafts) => ({
      ...drafts,
      [key]: { ...drafts[key], error: "" }
    }));
    try {
      const response = await fetch(
        `http://localhost:5000/api/advisor/follow-up-tasks/${task.record_id}/${task.task_index}/send-message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-demo-role": "advisor" },
          body: JSON.stringify(draft)
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to send message.");
      setTasks((items) => items.map((item) =>
        item.record_id === task.record_id && item.task_index === task.task_index
          ? {
              ...item,
              outreach_sent_at: data.data.sent_at,
              outreach_subject: data.data.subject,
              outreach_recipient: data.data.masked_recipient,
              outreach_delivery_reference: data.data.delivery_reference,
              outreach_delivery_status: data.data.delivery_status
            }
          : item
      ));
      setOutreachDrafts((drafts) => ({
        ...drafts,
        [key]: { ...drafts[key], sent: true, receipt: data.data }
      }));
      setMessage(`Demo email sent to ${data.data.masked_recipient}.`);
    } catch (sendError) {
      setError(sendError.message);
      setOutreachDrafts((drafts) => ({
        ...drafts,
        [key]: { ...drafts[key], error: sendError.message }
      }));
    } finally {
      setActionKey("");
    }
  }

  function renderTask(task) {
    const key = `${task.record_id}-${task.task_index}`;
    return (
      <article className={`follow-up-agent-task follow-up-agent-task--grouped${task.completed ? " follow-up-agent-task--completed" : ""}`} key={key}>
        <input className="app-input" value={task.task} onChange={(event) => editTask(task.record_id, task.task_index, "task", event.target.value)} aria-label="Follow-up task" />
        <select className="app-input" value={task.owner} onChange={(event) => editTask(task.record_id, task.task_index, "owner", event.target.value)} aria-label="Task owner">
          <option value="Advisor">Advisor</option>
          <option value="Customer">Customer</option>
        </select>
        <label className="follow-up-complete-toggle">
          <input type="checkbox" checked={task.completed} onChange={(event) => editTask(task.record_id, task.task_index, "completed", event.target.checked)} />
          <span>Completed</span>
        </label>
        <button className="btn btn-primary" type="button" onClick={() => saveTask(task)} disabled={savingKey === key}>{savingKey === key ? "Saving..." : "Save task"}</button>
        <div className="follow-up-outreach-actions">
          <button className="btn" type="button" onClick={() => generateMessage(task)} disabled={actionKey === `generate-${key}`}>
            {actionKey === `generate-${key}` ? "Generating..." : task.outreach_sent_at ? "Generate another message" : "Generate customer message"}
          </button>
          <span className={task.outreach_sent_at ? "follow-up-sent-status" : "muted"}>
            {task.outreach_sent_at ? `Email sent to ${task.outreach_recipient || "customer"} · ${formatDate(task.outreach_sent_at)}` : "No customer email sent for this action."}
          </span>
        </div>
        {outreachDrafts[key] && (
          <section className="follow-up-message-editor">
            <label>
              <span>Subject</span>
              <input className="app-input" value={outreachDrafts[key].subject} onChange={(event) => editMessage(key, "subject", event.target.value)} disabled={outreachDrafts[key].sent} />
            </label>
            <label>
              <span>Customer message</span>
              <textarea className="app-textarea" value={outreachDrafts[key].body} onChange={(event) => editMessage(key, "body", event.target.value)} disabled={outreachDrafts[key].sent} />
            </label>
            <div className="follow-up-send-row">
              <span className="muted">Demo email delivery · Advisor review is required before sending.</span>
              <button
                className={`btn ${outreachDrafts[key].sent ? "btn--sent" : "btn-primary"}`}
                type="button"
                onClick={() => sendMessage(task)}
                disabled={actionKey === `send-${key}` || outreachDrafts[key].sent}
              >
                {outreachDrafts[key].sent ? "Email Sent" : actionKey === `send-${key}` ? "Sending..." : "Send Email to Customer"}
              </button>
            </div>
            {outreachDrafts[key].error && <div className="alert follow-up-inline-error">{outreachDrafts[key].error}</div>}
            {outreachDrafts[key].receipt && (
              <div className="email-delivery-receipt">
                <strong>✓ Demo email delivered</strong>
                <span>To: {outreachDrafts[key].receipt.masked_recipient}</span>
                <span>Reference: {outreachDrafts[key].receipt.delivery_reference}</span>
                <span>Sent: {formatDate(outreachDrafts[key].receipt.sent_at)} at {formatTime(outreachDrafts[key].receipt.sent_at)}</span>
              </div>
            )}
          </section>
        )}
      </article>
    );
  }

  return (
    <main className="app-page follow-up-agent-page">
      <header className="page-header follow-up-agent-header">
        <div>
          <div className="view-badge">Advisor View</div>
          <p className="page-kicker">Clarity workflow agent</p>
          <h1>Follow-up Agent</h1>
          <p className="lead">Manage unresolved meeting actions after the advisor has reviewed the consultation record.</p>
        </div>
        <Link className="btn" to="/advisor-dashboard">Back to Meeting Manager</Link>
      </header>

      <section className="follow-up-stats">
        <div className="card"><strong>{stats.open}</strong><span>Open tasks</span></div>
        <div className="card"><strong>{stats.customer}</strong><span>Customer actions</span></div>
        <div className="card"><strong>{stats.completed}</strong><span>Completed</span></div>
      </section>

      {meetingIdFilter && scopedTasks[0] && (
        <section className="card follow-up-meeting-context">
          <div>
            <p className="page-kicker">Opened from Meeting Manager</p>
            <h2>{scopedTasks[0].customer_name}</h2>
            <p className="muted">{formatDate(scopedTasks[0].meeting_datetime)} at {formatTime(scopedTasks[0].meeting_datetime)} · {scopedTasks[0].product_interest || "General consultation"}</p>
          </div>
          <Link className="btn" to="/advisor/follow-up">Show all completed meetings</Link>
        </section>
      )}

      <section className="card follow-up-workspace">
        <div className="advisor-panel-heading">
          <div><p className="page-kicker">Task queue</p><h2>Meeting Follow-ups</h2></div>
          <div className="advisor-schedule-filters follow-up-filters">
            {[["open", "Open"], ["completed", "Completed"], ["all", "All"]].map(([value, label]) => (
              <button className={filter === value ? "advisor-filter--active" : ""} type="button" key={value} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
        </div>

        {error && <div className="alert">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        {loading && <p className="muted">Loading follow-up tasks...</p>}
        {!loading && visibleTasks.length === 0 && <div className="advisor-empty-state"><h3>No {filter} tasks</h3><p className="muted">Tasks generated from post-meeting records will appear here.</p></div>}

        <div className="follow-up-agent-list">
          {taskGroups.map((group) => (
            <section className="follow-up-meeting-group" key={group.meeting_id}>
              <header className="follow-up-meeting-group-header">
                <div>
                  <p className="page-kicker">Completed meeting</p>
                  <h3>{group.customer_name}</h3>
                  <span>{formatDate(group.meeting_datetime)} at {formatTime(group.meeting_datetime)} · {group.product_interest || "General consultation"}</span>
                </div>
                <div className="follow-up-meeting-group-status">
                  <span className="tag tag--completed">{group.meeting_status}</span>
                  <small>{group.tasks.filter((task) => task.completed).length}/{group.tasks.length} shown tasks completed</small>
                </div>
              </header>
              <div className="follow-up-meeting-task-list">{group.tasks.map(renderTask)}</div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

export default AdvisorFollowUpAgent;
