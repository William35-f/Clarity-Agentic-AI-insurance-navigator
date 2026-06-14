import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function CustomerSummary() {
  const navigate = useNavigate();

  const customerId = localStorage.getItem("customer_id");

  const [summary, setSummary] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [missingAnswers, setMissingAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingMissingInfo, setSavingMissingInfo] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchSummary = useCallback(async () => {
    if (!customerId) {
      setError("No customer profile found.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const summaryResponse = await fetch(
        `http://localhost:5000/api/customers/${customerId}/session-summary`
      );

      const summaryData = await summaryResponse.json();

      if (!summaryResponse.ok || !summaryData.success) {
        throw new Error(summaryData.message || "Failed to load summary.");
      }

      setSummary(summaryData.data);

      const readinessResponse = await fetch(
        `http://localhost:5000/api/customers/${customerId}/readiness-score`,
        {
          method: "POST"
        }
      );

      const readinessData = await readinessResponse.json();

      if (readinessData.success) {
        setReadiness(readinessData.data);
      }
    } catch (error) {
      console.error("Customer summary error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    let isActive = true;

    queueMicrotask(() => {
      if (isActive) {
        fetchSummary();
      }
    });

    return () => {
      isActive = false;
    };
  }, [fetchSummary]);

  function updateMissingAnswer(fieldName, value) {
    setMissingAnswers((prev) => ({
      ...prev,
      [fieldName]: value
    }));
  }

  async function saveMissingInfo(e) {
    e.preventDefault();

    if (!customerId) return;

    setSavingMissingInfo(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/customers/${customerId}/missing-info`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            answers: missingAnswers
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save missing information.");
      }

      localStorage.setItem("missing_info", JSON.stringify([]));
      setMissingAnswers({});
      setMessage("Missing information saved.");
      await fetchSummary();
    } catch (error) {
      console.error("Save missing info error:", error);
      setError(error.message);
    } finally {
      setSavingMissingInfo(false);
    }
  }

  function formatSummaryForDownload() {
    if (!summary) return "";

    const questions =
      summary.questions.length === 0
        ? "No questions asked yet."
        : summary.questions
            .map(
              (q, index) =>
                `${index + 1}. ${q.question} (${q.related_product || "General"})`
            )
            .join("\n");

    const tags =
      summary.concern_tags.length === 0
        ? "No major concerns detected yet."
        : summary.concern_tags.map((tag) => `- ${tag}`).join("\n");

    const missingInfo =
      summary.missing_info.length === 0
        ? "No missing information detected."
        : summary.missing_info
            .map((item) => `- ${item.field_name}: ${item.question}`)
            .join("\n");

    return `PRUPath Customer Session Summary

Profile
Name: ${summary.customer.full_name || "Not provided"}
Age: ${summary.customer.age || "Not provided"}
Occupation: ${summary.customer.occupation || "Not provided"}
Monthly Income: ${summary.customer.monthly_income || "Not provided"}
Main Goal: ${summary.customer.main_goal || "Not provided"}
Risk Appetite: ${summary.customer.risk_appetite || "Not provided"}
Existing Insurance: ${summary.customer.existing_insurance || "Not provided"}
Preferred Meeting Type: ${
      summary.customer.preferred_meeting_type || "Not provided"
    }

Readiness
Score: ${readiness ? `${readiness.score}%` : "Not calculated"}
Status: ${readiness?.status || "Not calculated"}
Reasons:
${
  readiness?.reasons?.length
    ? readiness.reasons.map((reason) => `- ${reason}`).join("\n")
    : "- No readiness reasons recorded."
}

Detected Product Interest
Product: ${
      summary.latest_product_interest?.product_category || "Not detected"
    }
Confidence: ${summary.latest_product_interest?.confidence || "Not detected"}
Reason: ${summary.latest_product_interest?.reason || "Not detected"}

Questions Asked
${questions}

Concern Tags
${tags}

Missing Information
${missingInfo}

Important: This summary is for meeting preparation only and is not financial advice. A Prudential Financial Representative should confirm suitability, affordability, charges, risks, exclusions, and policy terms.
`;
  }

  function downloadSummary() {
    const text = formatSummaryForDownload();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = String(summary?.customer?.full_name || "customer")
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    link.href = url;
    link.download = `prupath-summary-${safeName || "customer"}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
      <h1>Customer Session Summary</h1>

      <p style={{ color: "#555" }}>
        Before booking a meeting, review what PRUPath AI understood from your
        profile and questions.
      </p>

      {loading && <p>Loading summary...</p>}

      {error && (
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
          <strong>Error:</strong> {error}
        </div>
      )}

      {message && (
        <div
          style={{
            border: "1px solid #bbf7d0",
            backgroundColor: "#f0fdf4",
            color: "#166534",
            padding: "14px",
            borderRadius: "8px",
            marginBottom: "20px"
          }}
        >
          {message}
        </div>
      )}

      {readiness && (
        <div
          style={{
            border: "2px solid #bfdbfe",
            backgroundColor: "#eff6ff",
            padding: "18px",
            borderRadius: "10px",
            marginBottom: "20px"
          }}
        >
          <h2 style={{ marginTop: 0 }}>Readiness Score</h2>

          <p style={{ fontSize: "28px", fontWeight: "bold" }}>
            {readiness.score}%
          </p>

          <p>
            <strong>Status:</strong> {readiness.status}
          </p>

          {readiness.reasons.length > 0 && (
            <>
              <h3>Why this score?</h3>
              <ul>
                {readiness.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {summary && (
        <>
          <div
            style={{
              border: "1px solid #ddd",
              backgroundColor: "white",
              padding: "18px",
              borderRadius: "10px",
              marginBottom: "20px"
            }}
          >
            <h2>Profile Summary</h2>

            <p>
              <strong>Name:</strong> {summary.customer.full_name}
            </p>

            <p>
              <strong>Age:</strong> {summary.customer.age || "Not provided"}
            </p>

            <p>
              <strong>Occupation:</strong>{" "}
              {summary.customer.occupation || "Not provided"}
            </p>

            <p>
              <strong>Monthly Income:</strong>{" "}
              {summary.customer.monthly_income || "Not provided"}
            </p>

            <p>
              <strong>Main Goal:</strong>{" "}
              {summary.customer.main_goal || "Not provided"}
            </p>

            <p>
              <strong>Risk Appetite:</strong>{" "}
              {summary.customer.risk_appetite || "Not provided"}
            </p>
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              backgroundColor: "#f9fafb",
              padding: "18px",
              borderRadius: "10px",
              marginBottom: "20px"
            }}
          >
            <h2>Detected Product Interest</h2>

            {summary.latest_product_interest ? (
              <>
                <p>
                  <strong>Product:</strong>{" "}
                  {summary.latest_product_interest.product_category}
                </p>

                <p>
                  <strong>Confidence:</strong>{" "}
                  {summary.latest_product_interest.confidence}
                </p>

                <p>
                  <strong>Reason:</strong>{" "}
                  {summary.latest_product_interest.reason}
                </p>
              </>
            ) : (
              <p>No product interest has been detected yet.</p>
            )}
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              backgroundColor: "white",
              padding: "18px",
              borderRadius: "10px",
              marginBottom: "20px"
            }}
          >
            <h2>Your Questions</h2>

            {summary.questions.length === 0 ? (
              <p>No questions asked yet.</p>
            ) : (
              <ul>
                {summary.questions.map((q, index) => (
                  <li key={index}>
                    {q.question}{" "}
                    <strong>({q.related_product || "General"})</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              backgroundColor: "white",
              padding: "18px",
              borderRadius: "10px",
              marginBottom: "20px"
            }}
          >
            <h2>Concern Tags</h2>

            {summary.concern_tags.length === 0 ? (
              <p>No major concerns detected yet.</p>
            ) : (
              summary.concern_tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    display: "inline-block",
                    padding: "8px 12px",
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    borderRadius: "999px",
                    marginRight: "8px",
                    marginBottom: "8px"
                  }}
                >
                  {tag}
                </span>
              ))
            )}
          </div>

          <div
            style={{
              border: "2px solid #f59e0b",
              backgroundColor: "#fffbeb",
              padding: "18px",
              borderRadius: "10px",
              marginBottom: "20px"
            }}
          >
            <h2 style={{ color: "#92400e" }}>Missing Information</h2>

            {summary.missing_info.length === 0 ? (
              <p>No missing information detected.</p>
            ) : (
              <form onSubmit={saveMissingInfo}>
                {summary.missing_info.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "10px",
                      backgroundColor: "white",
                      border: "1px solid #fcd34d",
                      borderRadius: "8px",
                      marginBottom: "8px"
                    }}
                  >
                    <strong>{item.field_name}</strong>
                    <p style={{ margin: "4px 0 8px 0" }}>{item.question}</p>

                    {item.field_name === "risk_appetite" ? (
                      <select
                        value={missingAnswers[item.field_name] || ""}
                        onChange={(e) =>
                          updateMissingAnswer(item.field_name, e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid #ccc"
                        }}
                      >
                        <option value="">Select risk appetite</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    ) : item.field_name === "main_goal" ? (
                      <select
                        value={missingAnswers[item.field_name] || ""}
                        onChange={(e) =>
                          updateMissingAnswer(item.field_name, e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid #ccc"
                        }}
                      >
                        <option value="">Select goal</option>
                        <option value="Grow wealth">Grow wealth</option>
                        <option value="Protection">Protection</option>
                        <option value="Retirement planning">
                          Retirement planning
                        </option>
                        <option value="Education planning">
                          Education planning
                        </option>
                      </select>
                    ) : item.field_name === "preferred_meeting_type" ? (
                      <select
                        value={missingAnswers[item.field_name] || ""}
                        onChange={(e) =>
                          updateMissingAnswer(item.field_name, e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid #ccc"
                        }}
                      >
                        <option value="">Select meeting type</option>
                        <option value="Online">Online</option>
                        <option value="Offline">Offline</option>
                      </select>
                    ) : (
                      <input
                        type={
                          item.field_name === "monthly_income"
                            ? "number"
                            : "text"
                        }
                        value={missingAnswers[item.field_name] || ""}
                        onChange={(e) =>
                          updateMissingAnswer(item.field_name, e.target.value)
                        }
                        placeholder="Type your answer"
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid #ccc",
                          boxSizing: "border-box"
                        }}
                      />
                    )}
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={savingMissingInfo}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#dc2626",
                    color: "white",
                    cursor: savingMissingInfo ? "not-allowed" : "pointer"
                  }}
                >
                  {savingMissingInfo ? "Saving..." : "Save Missing Information"}
                </button>
              </form>
            )}
          </div>
        </>
      )}

      <button
        onClick={downloadSummary}
        disabled={!summary}
        style={{
          padding: "12px 18px",
          borderRadius: "8px",
          border: "1px solid #dc2626",
          backgroundColor: "white",
          color: "#dc2626",
          cursor: summary ? "pointer" : "not-allowed",
          marginRight: "10px"
        }}
      >
        Download Summary
      </button>

      <button
        onClick={() => navigate("/book-meeting")}
        style={{
          padding: "12px 18px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: "#dc2626",
          color: "white",
          cursor: "pointer",
          marginRight: "10px"
        }}
      >
        Continue to AI Meeting Booking
      </button>

      <button
        onClick={() => navigate("/document-chat")}
        style={{
          padding: "12px 18px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          backgroundColor: "white",
          cursor: "pointer"
        }}
      >
        Back to Chat
      </button>
    </div>
  );
}

export default CustomerSummary;
