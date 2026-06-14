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
          data.error || data.message || "Failed to get AI answer."
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          message: data.answer,
          source_note:
            data.source_note ||
            "Based on the PRUPath Product Knowledge Document.",
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
            "Sorry, the AI chat is not working right now. Please check the backend terminal error.",
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
    <div
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        fontFamily: "Arial",
        padding: "0 20px"
      }}
    >
      <h1>Document Chat</h1>

      <p style={{ color: "#555", lineHeight: "1.6" }}>
        Ask questions about Prudential investment-linked insurance products. The
        AI will explain using the PRUPath Product Knowledge Document and save
        useful questions for the advisor.
      </p>

      {!customerId && (
        <div
          style={{
            border: "1px solid #fecaca",
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            padding: "14px",
            borderRadius: "8px",
            marginBottom: "20px"
          }}
        >
          No customer profile found. Please go back and create a profile first.
          <br />
          <button
            onClick={() => navigate("/customer-profile")}
            style={{
              marginTop: "10px",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#dc2626",
              color: "white",
              cursor: "pointer"
            }}
          >
            Go to Customer Profile
          </button>
        </div>
      )}

      {missingInfo.length > 0 && (
        <div
          style={{
            border: "1px solid #facc15",
            backgroundColor: "#fefce8",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "20px"
          }}
        >
          <h2>Missing Information</h2>

          <p style={{ color: "#665c00" }}>
            The AI noticed some useful customer details are still missing. These
            will also be highlighted for the advisor.
          </p>

          {missingInfo.map((item, index) => (
            <div key={index} style={{ marginBottom: "8px" }}>
              <strong>
                {index + 1}. {item.question}
              </strong>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          border: "1px solid #ddd",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "20px",
          backgroundColor: "#fff",
          textAlign: "center"
        }}
      >
        <h2>Prudential Investment-Linked Insurance Navigator</h2>

        <p style={{ lineHeight: "1.6" }}>
          This AI explains Prudential investment-linked insurance products using
          your PRUPath Product Knowledge Document. It can compare features,
          explain risks, summarize charges, and help prepare questions for a
          Prudential Financial Representative.
        </p>

        <p style={{ color: "#666", fontSize: "14px" }}>
          It does not replace a Prudential Financial Representative and does not
          give final financial advice.
        </p>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "20px",
          backgroundColor: "#f9fafb"
        }}
      >
        <h2>Explanation Settings</h2>

        <label>
          <strong>Explanation Mode:</strong>
        </label>

        <select
          value={explanationMode}
          onChange={(e) => setExplanationMode(e.target.value)}
          style={{
            marginLeft: "10px",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #ccc"
          }}
        >
          <option value="simple">Explain Like I’m New</option>
          <option value="detailed">Detailed Explanation</option>
          <option value="comparison">Product Comparison</option>
        </select>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          padding: "16px",
          borderRadius: "8px",
          minHeight: "320px",
          marginBottom: "20px",
          backgroundColor: "#fafafa"
        }}
      >
        <h2>AI Chat</h2>

        {messages.length === 0 && (
          <div style={{ color: "#666" }}>
            <p>Try asking one of these:</p>

            <button
              type="button"
              onClick={() =>
                applySuggestedQuestion(
                  "How do investment-linked insurance plans work in general?",
                  "simple"
                )
              }
              style={{
                marginRight: "8px",
                marginBottom: "8px",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                cursor: "pointer"
              }}
            >
              How do ILPs work?
            </button>

            <button
              type="button"
              onClick={() =>
                applySuggestedQuestion(
                  "Are investment returns guaranteed?",
                  "simple"
                )
              }
              style={{
                marginRight: "8px",
                marginBottom: "8px",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                cursor: "pointer"
              }}
            >
              Are returns guaranteed?
            </button>

            <button
              type="button"
              onClick={() =>
                applySuggestedQuestion(
                  "Compare PRUUnited Wealth, PRUVantage Prosper, and PRUVantage Wealth III.",
                  "comparison"
                )
              }
              style={{
                marginRight: "8px",
                marginBottom: "8px",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                cursor: "pointer"
              }}
            >
              Compare products
            </button>

            <button
              type="button"
              onClick={() =>
                applySuggestedQuestion(
                  "What should I ask the advisor before deciding?",
                  "detailed"
                )
              }
              style={{
                marginBottom: "8px",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                cursor: "pointer"
              }}
            >
              Advisor questions
            </button>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: "14px",
              textAlign: msg.role === "user" ? "right" : "left"
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "12px 14px",
                borderRadius: "12px",
                backgroundColor:
                  msg.role === "user" ? "#dbeafe" : "#f3f4f6",
                maxWidth: "80%",
                lineHeight: "1.5",
                textAlign: "left"
              }}
            >
              <strong>{msg.role === "user" ? "You" : "AI"}:</strong>{" "}
              {msg.message}

              {msg.related_product && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#555",
                    marginTop: "8px",
                    marginBottom: 0
                  }}
                >
                  <strong>Related product:</strong> {msg.related_product}
                </p>
              )}

              {msg.concern_tags && msg.concern_tags.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  {msg.concern_tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      style={{
                        display: "inline-block",
                        fontSize: "12px",
                        padding: "4px 8px",
                        backgroundColor: "#fee2e2",
                        color: "#991b1b",
                        borderRadius: "999px",
                        marginRight: "6px",
                        marginBottom: "4px"
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {msg.source_note && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    marginTop: "8px",
                    marginBottom: 0,
                    borderTop: "1px solid #ddd",
                    paddingTop: "6px"
                  }}
                >
                  <strong>Source:</strong> {msg.source_note}
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && <p>AI is thinking...</p>}

        {error && (
          <p style={{ color: "red", marginTop: "12px" }}>
            Error: {error}
          </p>
        )}
      </div>

      <form
        onSubmit={handleAskQuestion}
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px"
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about product features, risks, charges, coverage, withdrawals, or meeting preparation..."
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc"
          }}
        />

        <button
          type="submit"
          disabled={loading || !customerId}
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: loading || !customerId ? "#999" : "#dc2626",
            color: "white",
            cursor: loading || !customerId ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Asking..." : "Ask"}
        </button>
      </form>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => navigate("/customer-summary")}
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#dc2626",
            color: "white",
            cursor: "pointer"
          }}
        >
          Review AI Summary
        </button>

        <button
          onClick={() => navigate("/customer-profile")}
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            backgroundColor: "white",
            cursor: "pointer"
          }}
        >
          Back to Profile
        </button>
      </div>
    </div>
  );
}

export default DocumentChat;
