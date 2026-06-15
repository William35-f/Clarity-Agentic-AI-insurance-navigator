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

    return `Clarity Customer Session Summary

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

  function renderMissingInput(item) {
    const value = missingAnswers[item.field_name] || "";
    const onChange = (e) => updateMissingAnswer(item.field_name, e.target.value);

    if (item.field_name === "risk_appetite") {
      return (
        <select className="app-select" value={value} onChange={onChange}>
          <option value="">Select risk appetite</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      );
    }

    if (item.field_name === "main_goal") {
      return (
        <select className="app-select" value={value} onChange={onChange}>
          <option value="">Select goal</option>
          <option value="Grow wealth">Grow wealth</option>
          <option value="Protection">Protection</option>
          <option value="Retirement planning">Retirement planning</option>
          <option value="Education planning">Education planning</option>
        </select>
      );
    }

    if (item.field_name === "preferred_meeting_type") {
      return (
        <select className="app-select" value={value} onChange={onChange}>
          <option value="">Select meeting type</option>
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
        </select>
      );
    }

    return (
      <input
        className="app-input"
        type={item.field_name === "monthly_income" ? "number" : "text"}
        value={value}
        onChange={onChange}
        placeholder="Type your answer"
      />
    );
  }

  return (
    <main className="app-page">
      <header className="page-header">
        <p className="page-kicker">Clarity readiness</p>
        <h1>Customer Session Summary</h1>
        <p className="lead">
          Before booking a meeting, review what Clarity understood from your
          profile and questions.
        </p>
      </header>

      {loading && <p className="muted">Loading summary...</p>}

      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {message && <div className="alert alert-success">{message}</div>}

      {readiness && (
        <section className="card section-card">
          <h2>Readiness Score</h2>
          <p className="metric">{readiness.score}%</p>
          <p>
            <strong>Status:</strong> {readiness.status}
          </p>

          {readiness.reasons.length > 0 && (
            <>
              <h3 style={{ marginTop: "16px" }}>Why this score?</h3>
              <ul>
                {readiness.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {summary && (
        <>
          <section className="card">
            <h2>Profile Summary</h2>
            <div className="details-grid">
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
          </section>

          <section className="card section-card">
            <h2>Detected Product Interest</h2>

            {summary.latest_product_interest ? (
              <div className="details-grid">
                <p>
                  <strong>Product:</strong>{" "}
                  <span className="highlight">
                    {summary.latest_product_interest.product_category}
                  </span>
                </p>
                <p>
                  <strong>Confidence:</strong>{" "}
                  {summary.latest_product_interest.confidence}
                </p>
                <p>
                  <strong>Reason:</strong>{" "}
                  {summary.latest_product_interest.reason}
                </p>
              </div>
            ) : (
              <p className="muted">No product interest has been detected yet.</p>
            )}
          </section>

          <section className="card">
            <h2>Your Questions</h2>
            {summary.questions.length === 0 ? (
              <p className="muted">No questions asked yet.</p>
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
          </section>

          <section className="card">
            <h2>Concern Tags</h2>
            {summary.concern_tags.length === 0 ? (
              <p className="muted">No major concerns detected yet.</p>
            ) : (
              <div className="tag-list">
                {summary.concern_tags.map((tag, index) => (
                  <span className="tag" key={index}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="card section-card">
            <h2>
              Missing <span className="highlight">Information</span>
            </h2>

            {summary.missing_info.length === 0 ? (
              <p className="muted">No missing information detected.</p>
            ) : (
              <form className="form-grid" onSubmit={saveMissingInfo}>
                {summary.missing_info.map((item, index) => (
                  <div className="card" key={index}>
                    <h3 className="highlight">{item.field_name}</h3>
                    <p style={{ marginBottom: "10px" }}>{item.question}</p>
                    {renderMissingInput(item)}
                  </div>
                ))}

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={savingMissingInfo}
                >
                  {savingMissingInfo ? "Saving..." : "Save Missing Information"}
                </button>
              </form>
            )}
          </section>
        </>
      )}

      <div className="button-row">
        <button
          className="btn btn-outline"
          onClick={downloadSummary}
          disabled={!summary}
        >
          Download Summary
        </button>

        <button
          className="btn btn-primary"
          onClick={() => navigate("/book-meeting")}
        >
          Continue to Clarity Meeting Booking
        </button>

        <button className="btn" onClick={() => navigate("/document-chat")}>
          Back to Chat
        </button>
      </div>
    </main>
  );
}

export default CustomerSummary;
