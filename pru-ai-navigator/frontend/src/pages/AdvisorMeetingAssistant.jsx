import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

function formatValue(value) {
  return value === undefined || value === null || value === "" ? "Not provided" : value;
}

function customerMisunderstanding(productInterest) {
  const product = String(productInterest || "").toLowerCase();
  if (product.includes("health") || product.includes("medical")) {
    return "Since I already have a hospital plan, every hospital expense will be fully covered, right?";
  }
  if (product.includes("life")) {
    return "If I get life protection, every type of death is automatically covered, correct?";
  }
  if (product.includes("wealth") || product.includes("prosper") || product.includes("pruvantage")) {
    return "So the monthly returns are guaranteed and my investment value cannot go down, right?";
  }
  return "If I choose one insurance plan, it should cover everything I need, right?";
}

function buildConversation(context) {
  const customer = context?.customer;
  const meeting = context?.meeting;
  if (!customer || !meeting) return [];

  return [
    {
      speaker: "Advisor",
      text: `Hi ${customer.full_name}. Before we begin, I would like to confirm your goals and what you want to understand today.`
    },
    {
      speaker: "Customer",
      text: `My main goal is ${String(customer.main_goal || "to understand my insurance needs").toLowerCase()}.`,
      coveragePattern: /goal|profile|need/i
    },
    {
      speaker: "Advisor",
      text: "Thank you. Before discussing any option, I will confirm your existing coverage, affordability, and risk comfort, then explain both the benefits and important limitations.",
      coveragePattern: /existing|coverage|afford|budget|risk appetite|risk comfort/i
    },
    {
      speaker: "Customer",
      text: customer.existing_insurance
        ? `I currently have ${customer.existing_insurance}.`
        : "I am not completely sure what my existing policies cover.",
      coveragePattern: /existing|coverage|protection gap/i
    },
    {
      speaker: "Advisor",
      text: "I will also explain charges, premium commitment, exclusions, withdrawal or surrender implications, and which outcomes are not guaranteed before we discuss next steps.",
      coveragePattern: /charge|premium|exclusion|withdraw|surrender|guarante|risk|limitation/i
    },
    { speaker: "Customer", text: customerMisunderstanding(meeting.product_interest) },
    {
      speaker: "Advisor",
      text: "Let me clarify that carefully. Coverage and outcomes depend on the policy terms, exclusions, charges, risks, and the specific benefits selected.",
      coveragePattern: /clarif|understand|guarante|risk|exclusion|charge/i
    },
    {
      speaker: "Customer",
      text: "Understood. I would like to review those conditions before deciding anything.",
      coveragePattern: /understand|confirm/i
    },
    {
      speaker: "Advisor",
      text: "Great. I will record the points we clarified, confirm your questions, and document the agreed follow-up actions and next steps.",
      coveragePattern: /question|document|follow-up|follow up|next step/i
    }
  ];
}

function AdvisorMeetingAssistant() {
  const [searchParams] = useSearchParams();
  const meetingId = searchParams.get("meeting_id") || localStorage.getItem("meeting_id") || "";
  const [context, setContext] = useState(null);
  const [started, setStarted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [activeCue, setActiveCue] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState([]);
  const [clarified, setClarified] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [checkedChecklistItems, setCheckedChecklistItems] = useState({});
  const [postMeetingRecord, setPostMeetingRecord] = useState(null);
  const [generatingRecord, setGeneratingRecord] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordMessage, setRecordMessage] = useState("");
  const [error, setError] = useState("");

  const conversation = useMemo(() => buildConversation(context), [context]);
  const visibleConversation = conversation.slice(0, visibleCount);
  const meeting = context?.meeting;
  const customer = context?.customer;
  const summaryChecklist = context?.advisor_summary?.checklist || [];

  useEffect(() => {
    async function loadContext() {
      if (!meetingId) {
        setError("Open the assistant from a scheduled appointment.");
        return;
      }
      try {
        const response = await fetch(
          `http://localhost:5000/api/advisor/chat/context?meeting_id=${meetingId}`,
          { headers: { "x-demo-role": "advisor" } }
        );
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load consultation context.");
        }
        setContext(data.data);

        const recordResponse = await fetch(
          `http://localhost:5000/api/advisor/meetings/${meetingId}/post-meeting`,
          { headers: { "x-demo-role": "advisor" } }
        );
        if (recordResponse.ok) {
          const recordData = await recordResponse.json();
          setPostMeetingRecord(recordData.data);
          setCompleted(true);
          const completedItems = {};
          recordData.data.checklist.forEach((item, index) => {
            if (item.completed) completedItems[index] = true;
          });
          setCheckedChecklistItems(completedItems);
        }
      } catch (loadError) {
        console.error("Guided consultation context error:", loadError);
        setError(loadError.message);
      }
    }
    loadContext();
  }, [meetingId]);

  async function analyzeStatement(statement) {
    setAnalyzing(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/advisor/meetings/${meetingId}/analyze-statement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-demo-role": "advisor" },
          body: JSON.stringify({ statement })
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Analysis failed.");
      if (data.data.misunderstanding_detected) {
        setActiveCue({ ...data.data, statement });
      }
    } catch (analysisError) {
      console.error("Statement analysis error:", analysisError);
      setError(analysisError.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function startConsultation() {
    setStarted(true);
    setVisibleCount(1);
    setActiveCue(null);
    setCompleted(false);
    setError("");
  }

  function showNextStatement() {
    if (visibleCount >= conversation.length) return;
    const nextLine = conversation[visibleCount];
    setVisibleCount((count) => count + 1);
    if (nextLine.coveragePattern) {
      setCheckedChecklistItems((items) => {
        const updated = { ...items };
        summaryChecklist.forEach((item, index) => {
          if (nextLine.coveragePattern.test(item)) updated[index] = true;
        });
        return updated;
      });
    }
    if (nextLine.speaker === "Customer") analyzeStatement(nextLine.text);
  }

  function markClarified() {
    if (!activeCue) return;
    setClarified(true);
    setMeetingNotes((notes) => [
      ...notes,
      `Clarified customer misunderstanding: ${activeCue.issue}`,
      `Advisor conduct reminder followed: ${activeCue.advisor_conduct_reminder}`
    ]);
    const clarificationIndex = summaryChecklist.findIndex((item) =>
      /clarif|understand|guarante|risk|exclusion|limitation/i.test(item)
    );
    if (clarificationIndex >= 0) {
      setCheckedChecklistItems((items) => ({ ...items, [clarificationIndex]: true }));
    }
    setActiveCue(null);
  }

  function addCueToNotes() {
    if (!activeCue) return;
    const note = `Customer statement: “${activeCue.statement}”\nFollow-up: ${activeCue.advisor_action}\nAdvisor conduct reminder: ${activeCue.advisor_conduct_reminder}`;
    setMeetingNotes((notes) => (notes.includes(note) ? notes : [...notes, note]));
  }

  async function completeMeeting() {
    const finalNotes = [
      ...meetingNotes,
      `Consultation completed with ${customer?.full_name || "customer"}.`,
      clarified
        ? "Customer misunderstanding was clarified during the consultation."
        : "Confirm customer understanding during follow-up."
    ];
    const checklist = summaryChecklist.map((text, index) => ({
      text,
      completed: Boolean(checkedChecklistItems[index])
    }));

    setMeetingNotes(finalNotes);
    setGeneratingRecord(true);
    setRecordMessage("");
    try {
      const response = await fetch(
        `http://localhost:5000/api/advisor/meetings/${meetingId}/post-meeting/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-demo-role": "advisor" },
          body: JSON.stringify({
            transcript: visibleConversation,
            notes: finalNotes,
            checklist
          })
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to prepare post-meeting record.");
      }
      setPostMeetingRecord(data.data);
      setCompleted(true);
      setRecordMessage("Draft generated. Review and approve the record below.");
    } catch (recordError) {
      setError(recordError.message);
    } finally {
      setGeneratingRecord(false);
    }
  }

  function toggleChecklistItem(index) {
    setCheckedChecklistItems((items) => ({ ...items, [index]: !items[index] }));
  }

  function updateRecordField(field, value) {
    setPostMeetingRecord((record) => ({ ...record, [field]: value }));
    setRecordMessage("");
  }

  function updateRecordChecklist(index, completedValue) {
    setPostMeetingRecord((record) => ({
      ...record,
      checklist: record.checklist.map((item, itemIndex) =>
        itemIndex === index ? { ...item, completed: completedValue } : item
      )
    }));
  }

  async function persistPostMeetingRecord(approve = false) {
    if (!postMeetingRecord) return;
    setSavingRecord(true);
    setRecordMessage("");
    try {
      const response = await fetch(
        `http://localhost:5000/api/advisor/meetings/${meetingId}/post-meeting${approve ? "/approve" : ""}`,
        {
          method: approve ? "POST" : "PUT",
          headers: { "Content-Type": "application/json", "x-demo-role": "advisor" },
          body: JSON.stringify(postMeetingRecord)
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save post-meeting record.");
      }
      setPostMeetingRecord(data.data);
      setRecordMessage(
        approve
          ? "Advisor approved. The meeting is now stored as a completed record."
          : "Draft saved."
      );
    } catch (saveError) {
      setRecordMessage(saveError.message);
    } finally {
      setSavingRecord(false);
    }
  }

  return (
    <main className="app-page guided-consultation-page">
      <header className="page-header guided-consultation-header">
        <div>
          <div className="view-badge">Advisor View</div>
          <p className="page-kicker">Clarity Guided Consultation</p>
          <h1>Meeting Assistant</h1>
          <p className="lead">Follow the conversation and act on Clarity cues while keeping the advisor in control.</p>
        </div>
        <Link className="btn" to="/advisor-dashboard">Back to Meeting Manager</Link>
      </header>

      {error && <div className="alert"><strong>Error:</strong> {error}</div>}

      <section className="card consultation-customer-bar">
        <div><span>Customer</span><strong>{formatValue(customer?.full_name)}</strong></div>
        <div><span>Consultation</span><strong>{formatValue(meeting?.meeting_type)}</strong></div>
        <div><span>Focus</span><strong>{formatValue(meeting?.product_interest)}</strong></div>
        <div>
          <span>Status</span>
          <strong>
            {postMeetingRecord?.approval_status === "Approved"
              ? "Approved"
              : postMeetingRecord
                ? "Review required"
                : started
                  ? "In progress"
                  : "Ready"}
          </strong>
        </div>
      </section>

      <div className="guided-consultation-layout">
        <section className="card consultation-transcript-panel">
          <div className="advisor-panel-heading">
            <div><p className="page-kicker">Conversation</p><h2>Consultation transcript</h2></div>
            {started && !completed && <span className="consultation-live-indicator">● In progress</span>}
          </div>

          {!started ? (
            <div className="consultation-start-state">
              <div className="meeting-manager-icon">C</div>
              <h3>Customer context is ready</h3>
              <p className="muted">Start the consultation, then reveal each statement when you are ready.</p>
              <button className="btn btn-primary" type="button" onClick={startConsultation} disabled={!context}>Start Consultation</button>
            </div>
          ) : (
            <>
              <div className="consultation-transcript" aria-live="polite">
                {visibleConversation.map((line, index) => (
                  <div className={`consultation-line consultation-line--${line.speaker.toLowerCase()}`} key={index}>
                    <span>{line.speaker}</span><p>{line.text}</p>
                  </div>
                ))}
                {analyzing && <p className="consultation-analyzing">Clarity is checking the latest statement…</p>}
              </div>

              <div className="consultation-controls">
                {visibleCount < conversation.length ? (
                  <button className="btn btn-primary" type="button" onClick={showNextStatement} disabled={analyzing}>Next Statement</button>
                ) : !completed ? (
                  <button className="btn btn-primary" type="button" onClick={completeMeeting} disabled={generatingRecord}>
                    {generatingRecord ? "Preparing review pack..." : "Complete Meeting"}
                  </button>
                ) : (
                  <span className="alert alert-success"><strong>Consultation completed.</strong> Notes are ready for review.</span>
                )}
                <span className="muted">{visibleCount} of {conversation.length} statements</span>
              </div>
            </>
          )}
        </section>

        <aside className="consultation-side-column">
          <section className={`card clarity-cue-card${activeCue ? " clarity-cue-card--active" : ""}`}>
            <div className="advisor-panel-heading"><h2>Clarity Cue</h2>{activeCue && <span className="tag">{activeCue.severity}</span>}</div>
            {!activeCue ? (
              <p className="muted">Clarity will highlight a possible customer misunderstanding here.</p>
            ) : (
              <>
                <blockquote>“{activeCue.statement}”</blockquote>
                <h3>Possible misunderstanding</h3><p>{activeCue.issue}</p>
                <h3>Suggested advisor action</h3><p>{activeCue.advisor_action}</p>
                <div className="conduct-reminder">
                  <strong>Advisor conduct reminder</strong>
                  <p>{activeCue.advisor_conduct_reminder}</p>
                </div>
                <p className="cue-source"><strong>Source:</strong> {activeCue.source}</p>
                <div className="button-row">
                  <button className="btn btn-primary" type="button" onClick={markClarified}>Mark Clarified</button>
                  <button className="btn" type="button" onClick={addCueToNotes}>Add to Notes</button>
                  <button className="btn" type="button" onClick={() => setActiveCue(null)}>Dismiss</button>
                </div>
              </>
            )}
          </section>

          <section className="card consultation-checklist-card">
            <h2>Advisor Checklist</h2>
            <p className="muted">Synced from this customer&apos;s preparation summary.</p>
            {summaryChecklist.length === 0 ? (
              <p className="muted">Generate the preparation summary from Meeting Manager to load the checklist.</p>
            ) : (
              summaryChecklist.map((item, index) => (
                <label className="checklist-item" key={index}>
                  <input
                    type="checkbox"
                    checked={Boolean(checkedChecklistItems[index])}
                    onChange={() => toggleChecklistItem(index)}
                  />
                  <span>{item}</span>
                </label>
              ))
            )}
          </section>

          <section className="card consultation-notes-card">
            <h2>Meeting Notes</h2>
            {meetingNotes.length === 0 ? <p className="muted">Actions and clarification points will appear here.</p> : (
              <ul>{meetingNotes.map((note, index) => <li key={index}>{note}</li>)}</ul>
            )}
          </section>
        </aside>
      </div>

      {postMeetingRecord && (
        <section className="card post-meeting-review" id="post-meeting-review">
          <div className="advisor-panel-heading">
            <div>
              <p className="page-kicker">Post-meeting record</p>
              <h2>Advisor Review and Approval</h2>
            </div>
            <span className={`tag ${postMeetingRecord.approval_status === "Approved" ? "tag--completed" : ""}`}>
              {postMeetingRecord.approval_status}
            </span>
          </div>

          <div className="post-meeting-grid">
            <section className="post-meeting-section">
              <label htmlFor="post-meeting-summary"><strong>1. Post-meeting summary</strong></label>
              <textarea
                id="post-meeting-summary"
                className="app-textarea"
                value={postMeetingRecord.summary}
                onChange={(event) => updateRecordField("summary", event.target.value)}
                disabled={postMeetingRecord.approval_status === "Approved"}
              />
            </section>

            <section className="post-meeting-section">
              <label htmlFor="post-meeting-notes"><strong>2. Editable notes</strong></label>
              <textarea
                id="post-meeting-notes"
                className="app-textarea"
                value={postMeetingRecord.notes}
                onChange={(event) => updateRecordField("notes", event.target.value)}
                disabled={postMeetingRecord.approval_status === "Approved"}
              />
            </section>

            <section className="post-meeting-section">
              <h3>3. Completed and unresolved checklist</h3>
              {postMeetingRecord.checklist.map((item, index) => (
                <label className="checklist-item post-checklist-item" key={index}>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(event) => updateRecordChecklist(index, event.target.checked)}
                    disabled={postMeetingRecord.approval_status === "Approved"}
                  />
                  <span>{item.text}</span>
                  <small>{item.completed ? "Completed" : "Unresolved"}</small>
                </label>
              ))}
            </section>

            <section className="post-meeting-section post-meeting-handoff">
              <div>
                <p className="page-kicker">Agent handoff</p>
                <h3>Follow-up tasks are ready</h3>
                <p className="muted">
                  {postMeetingRecord.follow_up_tasks.length} task(s) from this consultation will be managed by the Follow-up Agent.
                </p>
              </div>
              <Link className="btn" to="/advisor/follow-up">Open Follow-up Agent</Link>
            </section>
          </div>

          <div className="post-meeting-approval">
            <div>
              <h3>4. Advisor approval</h3>
              <p className="muted">Review the AI-generated draft before saving it as the completed meeting record.</p>
              {recordMessage && <p className="checklist-save-message">{recordMessage}</p>}
            </div>
            {postMeetingRecord.approval_status !== "Approved" && (
              <div className="button-row">
                <button className="btn" type="button" onClick={() => persistPostMeetingRecord(false)} disabled={savingRecord}>
                  Save Draft
                </button>
                <button className="btn btn-primary" type="button" onClick={() => persistPostMeetingRecord(true)} disabled={savingRecord}>
                  {savingRecord ? "Saving..." : "Approve and Complete"}
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

export default AdvisorMeetingAssistant;
