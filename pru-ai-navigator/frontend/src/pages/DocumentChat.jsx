import { useState } from "react";
import { useNavigate } from "react-router-dom";

function DocumentChat() {
  const navigate = useNavigate();

  const [missingInfo] = useState(() => {
    const savedMissingInfo = localStorage.getItem("missing_info");

    if (!savedMissingInfo) return [];

    try {
      return JSON.parse(savedMissingInfo);
    } catch {
      return [];
    }
  });
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [explanationMode, setExplanationMode] = useState("simple");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const customerId = localStorage.getItem("customer_id");

  async function handleAskQuestion(e) {
    e.preventDefault();

    if (!question.trim()) return;

    if (!customerId) {
      setError("No customer profile found. Please create a profile first.");
      return;
    }

    const userQuestion = question.trim();

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        message: userQuestion
      }
    ]);

    setQuestion("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/chat/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customer_id: customerId,
          question: userQuestion,
          explanation_mode: explanationMode
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || data.message || "Failed to get Clarity answer."
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          message: data.answer,
          source_note:
            data.source_note ||
            "Based on the Clarity Product Knowledge Document.",
          related_product: data.related_product,
          concern_tags: data.concern_tags || []
        },
        {
          role: "assistant",
          message: `Follow-up: ${data.follow_up_question}`,
          source_note: data.source_note || null
        }
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          message:
            "Sorry, Clarity is not working right now. Please check the backend terminal error.",
          source_note: "Source unavailable because the backend request failed."
        }
      ]);

      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function applySuggestedQuestion(text, mode = explanationMode) {
    setQuestion(text);
    setExplanationMode(mode);
  }

  return (
    <main className="app-page">
      <header className="page-header">
        <p className="page-kicker">Clarity guidance</p>
        <h1>Product Chat</h1>
        <p className="lead">
          Ask questions about Prudential investment-linked insurance products.
          Clarity explains using the Product Knowledge Document and
          saves useful questions for the advisor.
        </p>
      </header>

      {!customerId && (
        <div className="alert">
          <strong>No customer profile found.</strong> Please go back and create
          a profile first.
          <div className="button-row" style={{ marginTop: "12px" }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/customer-profile")}
            >
              Go to Customer Profile
            </button>
          </div>
        </div>
      )}

      {missingInfo.length > 0 && (
        <section className="card section-card">
          <h2>Missing Information</h2>
          <p className="muted">
            Clarity noticed some useful customer details are still missing.
            These will also be highlighted for the advisor.
          </p>

          <div className="tag-list">
            {missingInfo.map((item, index) => (
              <span className="tag" key={index}>
                {index + 1}. {item.question}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>Clarity Product Navigator</h2>
        <p>
          Clarity explains Prudential investment-linked insurance products using
          your Product Knowledge Document. It can compare features,
          explain risks, summarize charges, and help prepare questions for a
          Prudential Financial Representative.
        </p>
        <p className="muted" style={{ marginTop: "10px", fontSize: "0.9rem" }}>
          It does not replace a Prudential Financial Representative and does not
          give final financial advice.
        </p>
      </section>

      <section className="card section-card">
        <h2>Explanation Settings</h2>
        <div className="field">
          <label htmlFor="explanation-mode">Explanation Mode</label>
          <select
            id="explanation-mode"
            className="app-select"
            value={explanationMode}
            onChange={(e) => setExplanationMode(e.target.value)}
          >
            <option value="simple">Explain Like I'm New</option>
            <option value="detailed">Detailed Explanation</option>
            <option value="comparison">Product Comparison</option>
          </select>
        </div>
      </section>

      <section className="card chat-panel">
        <h2>Clarity Chat</h2>

        {messages.length === 0 && (
          <div className="muted">
            <p>Try asking one of these:</p>

            <div className="suggestions">
              <button
                className="btn"
                type="button"
                onClick={() =>
                  applySuggestedQuestion(
                    "How do investment-linked insurance plans work in general?",
                    "simple"
                  )
                }
              >
                How do ILPs work?
              </button>

              <button
                className="btn"
                type="button"
                onClick={() =>
                  applySuggestedQuestion(
                    "Are investment returns guaranteed?",
                    "simple"
                  )
                }
              >
                Are returns guaranteed?
              </button>

              <button
                className="btn"
                type="button"
                onClick={() =>
                  applySuggestedQuestion(
                    "Compare PRUUnited Wealth, PRUVantage Prosper, and PRUVantage Wealth III.",
                    "comparison"
                  )
                }
              >
                Compare products
              </button>

              <button
                className="btn"
                type="button"
                onClick={() =>
                  applySuggestedQuestion(
                    "What should I ask the advisor before deciding?",
                    "detailed"
                  )
                }
              >
                Advisor questions
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            className={`chat-message ${
              msg.role === "user" ? "chat-message-user" : ""
            }`}
            key={index}
          >
            <div className="chat-bubble">
              <strong>{msg.role === "user" ? "You" : "Clarity"}:</strong>{" "}
              {msg.message}

              {msg.related_product && (
                <p className="source-note">
                  <strong>Related product:</strong> {msg.related_product}
                </p>
              )}

              {msg.concern_tags && msg.concern_tags.length > 0 && (
                <div className="tag-list">
                  {msg.concern_tags.map((tag, tagIndex) => (
                    <span className="tag" key={tagIndex}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {msg.source_note && (
                <p className="source-note">
                  <strong>Source:</strong> {msg.source_note}
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && <p className="muted">Clarity is thinking...</p>}

        {error && (
          <p className="highlight" style={{ marginTop: "12px" }}>
            Error: {error}
          </p>
        )}
      </section>

      <form className="chat-form" onSubmit={handleAskQuestion}>
        <input
          className="app-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about product features, risks, charges, coverage, withdrawals, or meeting preparation..."
        />

        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading || !customerId}
        >
          {loading ? "Asking..." : "Ask"}
        </button>
      </form>

      <div className="button-row">
        <button
          className="btn btn-primary"
          onClick={() => navigate("/customer-summary")}
        >
          Review Clarity Summary
        </button>

        <button className="btn" onClick={() => navigate("/customer-profile")}>
          Back to Profile
        </button>
      </div>
    </main>
  );
}

export default DocumentChat;
