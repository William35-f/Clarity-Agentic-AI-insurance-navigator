import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function formatMeetingType(value) {
  return value === "Offline" ? "In-person" : value || "Not provided";
}

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return "Date not provided";

  return new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatTime(value) {
  const date = toDate(value);
  if (!date) return "Time not provided";

  return new Intl.DateTimeFormat("en-SG", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function isSameDay(first, second) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function dateForInput(dayOffset) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function AdvisorDashboard() {
  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState(
    () => localStorage.getItem("meeting_id") || ""
  );
  const [meeting, setMeeting] = useState(null);
  const [summary, setSummary] = useState(null);
  const [missingInfo, setMissingInfo] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingMeeting, setLoadingMeeting] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [editableChecklist, setEditableChecklist] = useState([]);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [checklistMessage, setChecklistMessage] = useState("");
  const [error, setError] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("upcoming");
  const [advisors, setAdvisors] = useState([]);
  const [selectedAvailabilityAdvisor, setSelectedAvailabilityAdvisor] = useState("");
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [availabilityForm, setAvailabilityForm] = useState({
    date: dateForInput(1),
    start_time: "09:00",
    end_time: "09:30",
    meeting_type: "Online"
  });

  const sortedMeetings = useMemo(
    () =>
      [...meetings].sort((first, second) => {
        const firstTime = toDate(first.meeting_datetime)?.getTime() || 0;
        const secondTime = toDate(second.meeting_datetime)?.getTime() || 0;
        return firstTime - secondTime;
      }),
    [meetings]
  );

  const visibleMeetings = useMemo(() => {
    if (scheduleFilter === "all") return sortedMeetings;
    if (scheduleFilter === "completed") {
      return sortedMeetings.filter(
        (item) => String(item.status || "").toLowerCase() === "completed"
      );
    }

    return sortedMeetings.filter(
      (item) => String(item.status || "").toLowerCase() !== "completed"
    );
  }, [scheduleFilter, sortedMeetings]);

  const scheduleGroups = useMemo(() => {
    return visibleMeetings.reduce((groups, item) => {
      const label = formatDate(item.meeting_datetime);
      const existing = groups.find((group) => group.label === label);

      if (existing) existing.items.push(item);
      else groups.push({ label, items: [item] });

      return groups;
    }, []);
  }, [visibleMeetings]);

  const scheduleStats = useMemo(() => {
    const now = new Date();
    const today = meetings.filter((item) => {
      const date = toDate(item.meeting_datetime);
      return date && isSameDay(date, now);
    }).length;
    const upcoming = meetings.filter(
      (item) => String(item.status || "").toLowerCase() !== "completed"
    ).length;
    const completed = meetings.filter(
      (item) => String(item.status || "").toLowerCase() === "completed"
    ).length;

    return { today, upcoming, completed };
  }, [meetings]);

  const selectedScheduleMeeting = useMemo(
    () => meetings.find((item) => String(item.meeting_id) === selectedMeetingId) || null,
    [meetings, selectedMeetingId]
  );

  const managerRecommendation = useMemo(() => {
    const upcoming = sortedMeetings.filter(
      (item) => String(item.status || "").toLowerCase() !== "completed"
    );
    const priority =
      upcoming.find((item) => item.preparation_status === "Needs attention") ||
      upcoming.find((item) => item.preparation_status === "Not started") ||
      upcoming[0];

    if (!priority) return null;
    const openItems = Number(priority.missing_info_count || 0);
    const action =
      priority.preparation_status === "Needs attention"
        ? `${openItems} missing information item${openItems === 1 ? "" : "s"} should be clarified.`
        : priority.preparation_status === "Ready"
          ? "The preparation pack is ready for review."
          : "Generate the preparation pack before the appointment.";

    return { meeting: priority, action };
  }, [sortedMeetings]);

  useEffect(() => {
    async function fetchSchedule() {
      setLoadingSchedule(true);
      setError("");

      try {
        const response = await fetch("http://localhost:5000/api/advisor/meetings", {
          headers: { "x-demo-role": "advisor" }
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load advisor schedule.");
        }

        const loadedMeetings = Array.isArray(data.data) ? data.data : [];
        setMeetings(loadedMeetings);

        if (loadedMeetings.length > 0) {
          const savedId = String(localStorage.getItem("meeting_id") || "");
          const savedMeetingExists = loadedMeetings.some(
            (item) => String(item.meeting_id) === savedId
          );
          const firstUpcoming = [...loadedMeetings]
            .sort((first, second) => {
              const firstTime = toDate(first.meeting_datetime)?.getTime() || 0;
              const secondTime = toDate(second.meeting_datetime)?.getTime() || 0;
              return firstTime - secondTime;
            })
            .find((item) => (toDate(item.meeting_datetime)?.getTime() || 0) >= Date.now());
          const nextId = savedMeetingExists
            ? savedId
            : String(firstUpcoming?.meeting_id || loadedMeetings[0].meeting_id);

          setSelectedMeetingId(nextId);
          localStorage.setItem("meeting_id", nextId);
        }
      } catch (loadError) {
        console.error("Advisor schedule load error:", loadError);
        setError(loadError.message);
      } finally {
        setLoadingSchedule(false);
      }
    }

    fetchSchedule();
  }, []);

  useEffect(() => {
    async function loadAdvisors() {
      try {
        const response = await fetch("http://localhost:5000/api/advisor/advisors", {
          headers: { "x-demo-role": "advisor" }
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Failed to load advisors.");
        setAdvisors(data.data || []);
        if (data.data?.length > 0) {
          setSelectedAvailabilityAdvisor((current) => current || String(data.data[0].advisor_id));
        }
      } catch (loadError) {
        setAvailabilityMessage(loadError.message);
      }
    }
    loadAdvisors();
  }, []);

  useEffect(() => {
    async function loadAvailability() {
      if (!selectedAvailabilityAdvisor) return;
      try {
        const response = await fetch(
          `http://localhost:5000/api/advisor/availability?advisor_id=${selectedAvailabilityAdvisor}`,
          { headers: { "x-demo-role": "advisor" } }
        );
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Failed to load availability.");
        setAvailabilitySlots(data.data || []);
      } catch (loadError) {
        setAvailabilityMessage(loadError.message);
      }
    }
    loadAvailability();
  }, [selectedAvailabilityAdvisor, availabilityRefresh]);

  useEffect(() => {
    async function fetchMeetingAndMissingInfo() {
      if (!selectedMeetingId) {
        setMeeting(null);
        setMissingInfo([]);
        return;
      }

      setLoadingMeeting(true);
      setSummary(null);
      setEditableChecklist([]);
      setChecklistMessage("");
      setError("");

      try {
        const meetingResponse = await fetch(
          `http://localhost:5000/api/meetings/${selectedMeetingId}`
        );
        const meetingData = await meetingResponse.json();

        if (!meetingResponse.ok || !meetingData.success) {
          throw new Error(meetingData.message || "Failed to load meeting.");
        }

        setMeeting(meetingData.data);
        const missingResponse = await fetch(
          `http://localhost:5000/api/customers/${meetingData.data.customer_id}/missing-info`
        );
        const missingData = await missingResponse.json();
        setMissingInfo(
          missingData.success && Array.isArray(missingData.data) ? missingData.data : []
        );
      } catch (loadError) {
        console.error("Advisor meeting load error:", loadError);
        setError(loadError.message);
      } finally {
        setLoadingMeeting(false);
      }
    }

    fetchMeetingAndMissingInfo();
  }, [selectedMeetingId]);

  function selectMeeting(meetingId) {
    const nextId = String(meetingId);
    localStorage.setItem("meeting_id", nextId);
    setSelectedMeetingId(nextId);
  }

  function updateAvailabilityForm(field, value) {
    setAvailabilityForm((form) => ({ ...form, [field]: value }));
    setAvailabilityMessage("");
  }

  async function addAvailability(event) {
    event.preventDefault();
    if (!selectedAvailabilityAdvisor) return;
    setSavingAvailability(true);
    setAvailabilityMessage("");
    try {
      const response = await fetch("http://localhost:5000/api/advisor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "advisor" },
        body: JSON.stringify({
          advisor_id: Number(selectedAvailabilityAdvisor),
          ...availabilityForm
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to add availability.");
      setAvailabilityMessage("Available time added. Customer matching can now use this slot.");
      setAvailabilityRefresh((value) => value + 1);
    } catch (saveError) {
      setAvailabilityMessage(saveError.message);
    } finally {
      setSavingAvailability(false);
    }
  }

  async function removeAvailability(slotId) {
    setAvailabilityMessage("");
    try {
      const response = await fetch(`http://localhost:5000/api/advisor/availability/${slotId}`, {
        method: "DELETE",
        headers: { "x-demo-role": "advisor" }
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to remove availability.");
      setAvailabilityMessage("Available time removed.");
      setAvailabilityRefresh((value) => value + 1);
    } catch (removeError) {
      setAvailabilityMessage(removeError.message);
    }
  }

  async function generateSummary() {
    if (!selectedMeetingId) return;

    setLoadingSummary(true);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/advisor/meetings/${selectedMeetingId}/generate-summary`,
        { method: "POST", headers: { "x-demo-role": "advisor" } }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to generate summary.");
      }

      setSummary(data.data);
      setEditableChecklist(data.data.checklist || []);
    } catch (summaryError) {
      console.error("Generate summary error:", summaryError);
      setError(summaryError.message);
    } finally {
      setLoadingSummary(false);
    }
  }

  function updateChecklistItem(index, value) {
    setEditableChecklist((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
    setChecklistMessage("");
  }

  function addChecklistItem() {
    setEditableChecklist((items) => [...items, ""]);
    setChecklistMessage("");
  }

  function removeChecklistItem(index) {
    setEditableChecklist((items) => items.filter((_, itemIndex) => itemIndex !== index));
    setChecklistMessage("");
  }

  async function saveChecklist() {
    const checklist = editableChecklist.map((item) => item.trim()).filter(Boolean);
    if (checklist.length === 0) {
      setChecklistMessage("Add at least one checklist item before saving.");
      return;
    }

    setSavingChecklist(true);
    setChecklistMessage("");
    try {
      const response = await fetch(
        `http://localhost:5000/api/advisor/meetings/${selectedMeetingId}/summary/checklist`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-demo-role": "advisor"
          },
          body: JSON.stringify({ checklist })
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save checklist.");
      }
      setEditableChecklist(data.data.checklist);
      setSummary((current) => ({ ...current, checklist: data.data.checklist }));
      setChecklistMessage("Checklist saved. The Meeting Assistant will use this version.");
    } catch (saveError) {
      setChecklistMessage(saveError.message);
    } finally {
      setSavingChecklist(false);
    }
  }

  return (
    <main className="app-page advisor-dashboard-page">
      <header className="page-header advisor-dashboard-hero">
        <div>
          <div className="view-badge">Advisor View</div>
          <p className="page-kicker">Clarity advisor workspace</p>
          <h1>Meeting Manager</h1>
          <p className="lead">
            Review upcoming appointments and open each customer&apos;s Clarity
            preparation summary before the meeting.
          </p>
        </div>
        <div className="advisor-schedule-stats" aria-label="Schedule overview">
          <div><strong>{scheduleStats.today}</strong><span>Today</span></div>
          <div><strong>{scheduleStats.upcoming}</strong><span>Upcoming</span></div>
          <div><strong>{scheduleStats.completed}</strong><span>Completed</span></div>
        </div>
      </header>

      {error && <div className="alert"><strong>Error:</strong> {error}</div>}

      {managerRecommendation && (
        <section className="card meeting-manager-card">
          <div className="meeting-manager-icon" aria-hidden="true">C</div>
          <div className="meeting-manager-copy">
            <p className="page-kicker">Clarity Meeting Manager</p>
            <h2>Recommended next preparation</h2>
            <p>
              Prepare for <strong>{managerRecommendation.meeting.customer_name}</strong> on{" "}
              <strong>{formatDate(managerRecommendation.meeting.meeting_datetime)}</strong>.{" "}
              {managerRecommendation.action}
            </p>
          </div>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              setScheduleFilter("upcoming");
              selectMeeting(managerRecommendation.meeting.meeting_id);
            }}
          >
            Open appointment
          </button>
        </section>
      )}

      <section className="card advisor-availability-manager">
        <div className="advisor-panel-heading">
          <div>
            <p className="page-kicker">Availability matching</p>
            <h2>Upload Available Time</h2>
          </div>
          <span className="tag">Next 7 days</span>
        </div>
        <p className="muted">
          Add advisor availability here. Unbooked slots are immediately included in the customer consultation matcher.
        </p>

        <div className="advisor-availability-layout">
          <form className="advisor-availability-form" onSubmit={addAvailability}>
            <label>
              <span>Advisor</span>
              <select
                className="app-input"
                value={selectedAvailabilityAdvisor}
                onChange={(event) => {
                  setSelectedAvailabilityAdvisor(event.target.value);
                  setAvailabilityMessage("");
                }}
                required
              >
                {advisors.map((advisor) => (
                  <option value={advisor.advisor_id} key={advisor.advisor_id}>
                    {advisor.full_name} — {advisor.specialty || "General"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Date</span>
              <input
                className="app-input"
                type="date"
                min={dateForInput(0)}
                max={dateForInput(6)}
                value={availabilityForm.date}
                onChange={(event) => updateAvailabilityForm("date", event.target.value)}
                required
              />
            </label>
            <label>
              <span>Start</span>
              <input className="app-input" type="time" value={availabilityForm.start_time} onChange={(event) => updateAvailabilityForm("start_time", event.target.value)} required />
            </label>
            <label>
              <span>End</span>
              <input className="app-input" type="time" value={availabilityForm.end_time} onChange={(event) => updateAvailabilityForm("end_time", event.target.value)} required />
            </label>
            <label>
              <span>Format</span>
              <select className="app-input" value={availabilityForm.meeting_type} onChange={(event) => updateAvailabilityForm("meeting_type", event.target.value)}>
                <option value="Online">Online</option>
                <option value="Offline">In-person</option>
              </select>
            </label>
            <button className="btn btn-primary" type="submit" disabled={savingAvailability || advisors.length === 0}>
              {savingAvailability ? "Adding..." : "Add Available Time"}
            </button>
          </form>

          <div className="advisor-availability-list">
            <h3>Current matching slots</h3>
            {availabilitySlots.length === 0 ? (
              <p className="muted">No available times in the next 7 days.</p>
            ) : (
              availabilitySlots.map((slot) => (
                <div className="advisor-availability-slot" key={slot.slot_id}>
                  <div>
                    <strong>{formatDate(slot.start_datetime)} · {formatTime(slot.start_datetime)}–{formatTime(slot.end_datetime)}</strong>
                    <span>{formatMeetingType(slot.meeting_type)} · {slot.is_booked ? "Booked" : "Available"}</span>
                  </div>
                  {!slot.is_booked && (
                    <button className="btn" type="button" onClick={() => removeAvailability(slot.slot_id)}>Remove</button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        {availabilityMessage && <p className="checklist-save-message">{availabilityMessage}</p>}
      </section>

      <div className="advisor-schedule-layout">
        <aside className="card advisor-schedule-panel">
          <div className="advisor-panel-heading">
            <div><p className="page-kicker">Agenda</p><h2>Appointments</h2></div>
            <span className="tag">{visibleMeetings.length} shown</span>
          </div>

          <div className="advisor-schedule-filters" aria-label="Filter meetings">
            {[
              ["upcoming", "Upcoming"],
              ["completed", "Completed"],
              ["all", "All"]
            ].map(([value, label]) => (
              <button
                className={scheduleFilter === value ? "advisor-filter--active" : ""}
                key={value}
                type="button"
                onClick={() => setScheduleFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {loadingSchedule && <p className="muted">Loading schedule...</p>}
          {!loadingSchedule && scheduleGroups.length === 0 && (
            <div className="advisor-empty-state">
              <h3>No {scheduleFilter} meetings</h3>
              <p className="muted">Try another schedule filter.</p>
            </div>
          )}

          <div className="advisor-agenda-list">
            {scheduleGroups.map((group) => (
              <section className="advisor-agenda-day" key={group.label}>
                <h3>{group.label}</h3>
                {group.items.map((item) => {
                  const isSelected = String(item.meeting_id) === selectedMeetingId;
                  return (
                    <button
                      className={`advisor-meeting-card${isSelected ? " advisor-meeting-card--active" : ""}`}
                      key={item.meeting_id}
                      type="button"
                      onClick={() => selectMeeting(item.meeting_id)}
                      aria-pressed={isSelected}
                    >
                      <span className="advisor-meeting-time">{formatTime(item.meeting_datetime)}</span>
                      <span className="advisor-meeting-card-content">
                        <strong>{item.customer_name}</strong>
                        <span>{formatMeetingType(item.meeting_type)} · {item.product_interest || "General consultation"}</span>
                        <span className="advisor-card-badges">
                          <small>{item.status || "Scheduled"}</small>
                          {String(item.status).toLowerCase() === "completed" ? (
                            <small className="advisor-prep-badge">
                              {item.post_meeting_status === "Approved"
                                ? `${Number(item.follow_up_completed || 0)}/${Number(item.follow_up_total || 0)} follow-ups`
                                : "Record needs approval"}
                            </small>
                          ) : (
                            <small className="advisor-prep-badge">{item.preparation_status || "Not started"}</small>
                          )}
                        </span>
                      </span>
                      <span className="advisor-meeting-arrow" aria-hidden="true">›</span>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        </aside>

        <section className="advisor-brief-column" aria-live="polite">
          {loadingMeeting && <div className="card"><p className="muted">Loading customer brief...</p></div>}

          {!loadingMeeting && !meeting && (
            <div className="card advisor-empty-state">
              <h2>Select a meeting</h2>
              <p className="muted">Choose an appointment to review its customer summary.</p>
            </div>
          )}

          {!loadingMeeting && meeting && (
            <>
              <section className="card advisor-selected-brief">
                <div className="advisor-panel-heading">
                  <div><p className="page-kicker">Selected appointment</p><h2>{meeting.customer_name}</h2></div>
                  <span className={`tag ${String(meeting.status).toLowerCase() === "completed" ? "tag--completed" : ""}`}>
                    {meeting.status || "Scheduled"}
                  </span>
                </div>

                <div className="advisor-appointment-banner">
                  <div><span>Date</span><strong>{formatDate(meeting.meeting_datetime)}</strong></div>
                  <div><span>Time</span><strong>{formatTime(meeting.meeting_datetime)}</strong></div>
                  <div><span>Format</span><strong>{formatMeetingType(meeting.meeting_type)}</strong></div>
                </div>

                <div className="details-grid advisor-brief-details">
                  <p><strong>Main goal:</strong> {meeting.main_goal || "Not provided"}</p>
                  <p><strong>Product interest:</strong> <span className="highlight">{meeting.product_interest || "Not detected"}</span></p>
                  <p><strong>Risk appetite:</strong> {meeting.risk_appetite || "Not provided"}</p>
                  <p><strong>Occupation:</strong> {meeting.occupation || "Not provided"}</p>
                  <p><strong>Existing insurance:</strong> {meeting.existing_insurance || "Not provided"}</p>
                  <p><strong>Advisor:</strong> {meeting.advisor_name}</p>
                </div>

                {String(meeting.status).toLowerCase() === "completed" && (
                  <div className="meeting-follow-up-summary">
                    {selectedScheduleMeeting?.post_meeting_status === "Approved" ? (
                      <>
                        <div><span>Follow-up progress</span><strong>{Number(selectedScheduleMeeting.follow_up_completed || 0)} of {Number(selectedScheduleMeeting.follow_up_total || 0)} completed</strong></div>
                        <div><span>Customer outreach</span><strong>{Number(selectedScheduleMeeting.follow_up_sent || 0)} message{Number(selectedScheduleMeeting.follow_up_sent || 0) === 1 ? "" : "s"} sent</strong></div>
                      </>
                    ) : (
                      <div className="meeting-follow-up-summary--wide"><span>Follow-up status</span><strong>Approve the completed meeting record before follow-up tasks are released.</strong></div>
                    )}
                  </div>
                )}

                <div className="button-row">
                  {String(meeting.status).toLowerCase() === "completed" ? (
                    <>
                      <Link className="btn" to={`/advisor/meeting-assistant?meeting_id=${selectedMeetingId}`}>View Completed Record</Link>
                      {selectedScheduleMeeting?.post_meeting_status === "Approved" && (
                        <Link className="btn btn-primary" to={`/advisor/follow-up?meeting_id=${selectedMeetingId}`}>Manage Follow-ups</Link>
                      )}
                    </>
                  ) : (
                    <>
                      <button className="btn btn-primary" onClick={generateSummary} disabled={loadingSummary}>
                        {loadingSummary ? "Generating summary..." : summary ? "Refresh Prep Summary" : "View Prep Summary"}
                      </button>
                      <Link className="btn" to={`/advisor/meeting-assistant?meeting_id=${selectedMeetingId}`}>Open Meeting Assistant</Link>
                    </>
                  )}
                </div>
              </section>

              <section className="card advisor-missing-card">
                <div className="advisor-panel-heading">
                  <h2>Information to confirm</h2>
                  <span className="tag">{missingInfo.length} item{missingInfo.length === 1 ? "" : "s"}</span>
                </div>
                {missingInfo.length === 0 ? (
                  <p className="muted">No major missing customer information was detected.</p>
                ) : (
                  <ul>
                    {missingInfo.map((item, index) => (
                      <li key={item.missing_id || index}><strong>{item.field_name}:</strong> {item.question}</li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </section>
      </div>

      {summary && (
        <section className="card section-card advisor-prep-pack">
          <div className="advisor-panel-heading">
            <div><p className="page-kicker">Clarity preparation pack</p><h2>{meeting?.customer_name} — Meeting Summary</h2></div>
            <Link className="btn" to={`/advisor/meeting-assistant?meeting_id=${selectedMeetingId}`}>Start meeting</Link>
          </div>

          <div className="advisor-prep-grid">
            <section className="prep-section advisor-prep-summary">
              <h3>Customer Summary</h3><p>{summary.customer_summary}</p>
            </section>
            <section className="prep-section">
              <h3>Product Interest</h3><p className="highlight">{summary.product_interest}</p>
            </section>
            <section className="prep-section">
              <h3>Questions Asked</h3>
              {summary.questions_asked.length === 0 ? <p className="muted">No questions recorded.</p> : (
                <ul>{summary.questions_asked.map((item, index) => <li key={index}>{item}</li>)}</ul>
              )}
            </section>
            <section className="prep-section">
              <h3>Clarification Points</h3>
              {summary.clarification_points.length === 0 ? <p className="muted">No clarification points generated.</p> : (
                <ul>{summary.clarification_points.map((item, index) => <li key={index}>{item}</li>)}</ul>
              )}
            </section>
            <section className="prep-section">
              <h3>Advisor Checklist</h3>
              <p className="muted">Edit the checklist before starting the consultation.</p>
              <div className="editable-checklist">
                {editableChecklist.map((item, index) => (
                  <div className="editable-checklist-row" key={index}>
                    <input
                      className="app-input"
                      value={item}
                      onChange={(event) => updateChecklistItem(index, event.target.value)}
                      aria-label={`Checklist item ${index + 1}`}
                    />
                    <button className="btn" type="button" onClick={() => removeChecklistItem(index)}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="button-row editable-checklist-actions">
                <button className="btn" type="button" onClick={addChecklistItem}>Add Item</button>
                <button className="btn btn-primary" type="button" onClick={saveChecklist} disabled={savingChecklist}>
                  {savingChecklist ? "Saving..." : "Save Checklist"}
                </button>
              </div>
              {checklistMessage && <p className="checklist-save-message">{checklistMessage}</p>}
            </section>
          </div>
        </section>
      )}
    </main>
  );
}

export default AdvisorDashboard;
