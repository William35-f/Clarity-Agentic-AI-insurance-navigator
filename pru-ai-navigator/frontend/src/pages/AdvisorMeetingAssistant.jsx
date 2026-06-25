import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const quickPrompts = [
  "Explain this simply",
  "Compare product categories",
  "Suggest follow-up questions",
  "Summarise customer concerns",
  "Draft meeting notes",
  "Check missing information"
];

function formatValue(value) {
  return value === undefined || value === null || value === "" ? "Not provided" : value;
}

function AdvisorMeetingAssistant() {
  const [searchParams] = useSearchParams();
  const customerId =
    searchParams.get("customer_id") || localStorage.getItem("customer_id") || "";
  const meetingId =
    searchParams.get("meeting_id") || localStorage.getItem("meeting_id") || "";

  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [missingInformation, setMissingInformation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const contextQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (customerId) params.set("customer_id", customerId);
    if (meetingId) params.set("meeting_id", meetingId);
    return params.toString();
  }, [customerId, meetingId]);

  useEffect(() => {
    async function loadContext() {
      if (!contextQuery) return;

      try {
        const response = await fetch(
          `http://localhost:5000/api/advisor/chat/context?${contextQuery}`,
          {
            headers: {
              "x-demo-role": "advisor"
            }
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load customer context.");
        }

        setContext(data.data);
      } catch (loadError) {
        console.error("Advisor assistant context error:", loadError);
        setError(loadError.message);
      }
    }

    loadContext();
  }, [contextQuery]);

  async function sendAdvisorMessage(text = message) {
    const cleanMessage = text.trim();

    if (!cleanMessage) {
      setError("Please enter a message for Clarity.");
      return;
    }

    setMessages((prev) => [...prev, { role: "advisor", message: cleanMessage }]);
    setMessage("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/advisor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-role": "advisor"
        },
        body: JSON.stringify({
          customer_id: customerId || undefined,
          meeting_id: meetingId || undefined,
          message: cleanMessage,
          current_meeting_notes: meetingNotes,
          customer_context: context
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to get advisor assistant reply.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          message: data.reply,
          suggested_questions: data.suggested_questions || [],
          missing_information: data.missing_information || []
        }
      ]);
      setSuggestedQuestions(data.suggested_questions || []);
      setMissingInformation(data.missing_information || []);

      if (data.meeting_notes_update) {
        setMeetingNotes((prev) =>
          [prev, data.meeting_notes_update].filter(Boolean).join("\n\n")
        );
      }
    } catch (chatError) {
      console.error("Advisor assistant chat error:", chatError);
      setError(chatError.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyNotes() {
    await navigator.clipboard.writeText(meetingNotes || "");
    setCopyMessage("Notes copied.");
    setTimeout(() => setCopyMessage(""), 1600);
  }

  const customer = context?.customer || null;
  const summary = context?.advisor_summary || null;
  const productInterest =
    summary?.product_interest || context?.latest_product_interest?.product_category;

  return (
    <main className="app-page advisor-assistant-page">
      <header className="page-header">
        <div className="view-badge">Advisor View</div>
        <p className="page-kicker">Clarity meeting copilot</p>
        <h1>Advisor Meeting Assistant</h1>
        <p className="lead">
          Use Clarity during the meeting to explain concepts, clarify customer
          concerns, and capture follow-up actions.
        </p>
      </header>

      <div className="advisor-assistant-layout">
        <aside className="card advisor-context-panel">
          <h2>Customer Context</h2>
          {!customer ? (
            <p className="muted">
              Select a customer or open this assistant from an advisor brief to
              load meeting context.
            </p>
          ) : (
            <div className="context-list">
              <p><strong>Name:</strong> {formatValue(customer.full_name)}</p>
              <p><strong>Age:</strong> {formatValue(customer.age)}</p>
              <p><strong>Occupation:</strong> {formatValue(customer.occupation)}</p>
              <p><strong>Monthly income:</strong> {formatValue(customer.monthly_income)}</p>
              <p><strong>Risk comfort:</strong> {formatValue(customer.risk_appetite)}</p>
              <p><strong>Main goal:</strong> {formatValue(customer.main_goal)}</p>
              <p><strong>Existing insurance:</strong> {formatValue(customer.existing_insurance)}</p>
              <p><strong>Meeting type:</strong> {formatValue(customer.preferred_meeting_type)}</p>
              <p><strong>AI interview summary:</strong> {formatValue(summary?.customer_summary)}</p>
              <p><strong>Suggested categories:</strong> {formatValue(productInterest)}</p>
            </div>
          )}
        </aside>

        <section className="card advisor-chat-panel">
          <h2>Meeting Chat</h2>
          <p className="muted">
            Clarity supports the Financial Representative during the discussion.
            Final recommendations should be made by the licensed representative
            after confirming the customer's needs.
          </p>

          <div className="suggestions">
            {quickPrompts.map((prompt) => (
              <button
                className="btn"
                type="button"
                key={prompt}
                onClick={() => sendAdvisorMessage(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="advisor-chat-history">
            {messages.length === 0 && (
              <p className="muted">
                Ask Clarity to explain concepts, compare broad product categories,
                identify missing information, or draft meeting notes.
              </p>
            )}
            {messages.map((item, index) => (
              <div
                className={`chat-message ${
                  item.role === "advisor" ? "chat-message-user" : ""
                }`}
                key={index}
              >
                <div className="chat-bubble">
                  <strong>{item.role === "advisor" ? "Advisor" : "Clarity"}:</strong>{" "}
                  {item.message}
                </div>
              </div>
            ))}
            {loading && <p className="muted">Clarity is preparing a response...</p>}
          </div>

          {error && <div className="alert">{error}</div>}

          <form
            className="chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              sendAdvisorMessage();
            }}
          >
            <input
              className="app-input"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about explanations, missing info, comparisons, or meeting notes..."
            />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Asking..." : "Ask"}
            </button>
          </form>
        </section>

        <aside className="card advisor-notes-panel">
          <div className="notes-header">
            <h2>Meeting Notes</h2>
            <button className="btn" type="button" onClick={copyNotes} disabled={!meetingNotes}>
              Copy
            </button>
          </div>
          {copyMessage && <p className="muted">{copyMessage}</p>}
          <textarea
            className="app-textarea notes-textarea"
            value={meetingNotes}
            onChange={(event) => setMeetingNotes(event.target.value)}
            placeholder="AI-generated notes and advisor edits will appear here..."
          />

          <section className="prep-section">
            <h3>Suggested follow-up questions</h3>
            {suggestedQuestions.length === 0 ? (
              <p className="muted">No suggestions yet.</p>
            ) : (
              <ul>
                {suggestedQuestions.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="prep-section">
            <h3>Missing information</h3>
            {missingInformation.length === 0 ? (
              <p className="muted">No missing information flagged yet.</p>
            ) : (
              <ul>
                {missingInformation.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

export default AdvisorMeetingAssistant;
