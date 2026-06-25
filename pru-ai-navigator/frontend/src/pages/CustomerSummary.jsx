import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerJourneyStepper from "../components/CustomerJourneyStepper";

const FIELD_LABELS = {
  monthly_income: "Monthly Income",
  main_goal: "Main Goal",
  risk_appetite: "Risk Appetite",
  existing_insurance: "Existing Insurance",
  preferred_meeting_type: "Preferred Meeting Type"
};

const FIELD_ALIASES = {
  monthly_income: ["monthly income", "monthly salary", "salary", "monthly pay"],
  risk_appetite: ["risk appetite", "risk tolerance", "investment risk comfort"],
  main_goal: ["main goal", "financial goal", "goal", "objective"],
  existing_insurance: [
    "existing insurance",
    "insurance coverage",
    "current insurance",
    "coverage"
  ],
  preferred_meeting_type: [
    "preferred meeting type",
    "meeting type",
    "meeting preference"
  ]
};

const DISCUSSION_CATEGORY_DETAILS = {
  "Health Protection": {
    title: "Health Protection",
    description:
      "Review hospital, medical, and health-related protection needs before the meeting.",
    advisorClarify:
      "Confirm current medical coverage, exclusions, claim limits, and whether additional health protection is needed."
  },
  "Life Protection": {
    title: "Life Protection",
    description:
      "Discuss income protection, family responsibilities, death coverage, and long-term protection gaps.",
    advisorClarify:
      "Confirm dependents, existing life cover, affordability, and the right level of protection."
  },
  "Wealth Accumulation": {
    title: "Wealth Accumulation",
    description:
      "Explore long-term wealth growth goals, risk comfort, premium commitment, and non-guaranteed returns.",
    advisorClarify:
      "Confirm investment risk understanding, charges, premium budget, time horizon, and fund choices."
  },
  "Legacy Planning": {
    title: "Legacy Planning",
    description:
      "Review retirement, wealth continuity, beneficiary, and legacy planning goals raised during the interview.",
    advisorClarify:
      "Confirm intended beneficiaries, planning timeline, liquidity needs, and policy ownership details."
  },
  "General Prudential ILP": {
    title: "General Prudential ILP",
    description:
      "Use the meeting to clarify general investment-linked insurance features, risks, charges, and suitability.",
    advisorClarify:
      "Confirm whether an investment-linked plan is appropriate after reviewing needs, budget, and risk comfort."
  }
};

function normalizeDiscussionCategory(value = "") {
  const text = String(value || "").toLowerCase();

  if (text.includes("health") || text.includes("medical") || text.includes("hospital")) {
    return "Health Protection";
  }

  if (text.includes("life") || text.includes("family") || text.includes("protection")) {
    return "Life Protection";
  }

  if (text.includes("linkguard")) {
    return "Life Protection";
  }

  if (
    text.includes("wealth") ||
    text.includes("pruvantage") ||
    text.includes("prulink") ||
    text.includes("pruunited") ||
    text.includes("invest") ||
    text.includes("growth") ||
    text.includes("savings")
  ) {
    return "Wealth Accumulation";
  }

  if (
    text.includes("legacy") ||
    text.includes("retirement") ||
    text.includes("estate")
  ) {
    return "Legacy Planning";
  }

  return "General Prudential ILP";
}

function buildDiscussionCategories(summary) {
  if (!summary) return [];

  const scores = new Map();
  const reasons = new Map();

  function addCategory(category, reason, weight = 1) {
    if (!String(category || "").trim()) return;

    const normalizedCategory = normalizeDiscussionCategory(category);

    scores.set(normalizedCategory, (scores.get(normalizedCategory) || 0) + weight);
    reasons.set(normalizedCategory, [
      ...(reasons.get(normalizedCategory) || []),
      reason
    ].filter(Boolean));
  }

  summary.questions.forEach((item) => {
    addCategory(
      item.related_product,
      `Raised through the question: "${item.question}"`,
      2
    );
  });

  addCategory(
    summary.customer.main_goal,
    `Profile goal: ${summary.customer.main_goal || "Not provided"}`,
    1
  );
  addCategory(
    summary.customer.existing_insurance,
    `Existing insurance: ${summary.customer.existing_insurance || "Not provided"}`,
    1
  );

  if (summary.latest_product_interest?.product_category) {
    addCategory(
      summary.latest_product_interest.product_category,
      summary.latest_product_interest.reason,
      3
    );
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, score]) => ({
      category,
      score,
      ...(DISCUSSION_CATEGORY_DETAILS[category] ||
        DISCUSSION_CATEGORY_DETAILS["General Prudential ILP"]),
      reason: [...new Set(reasons.get(category) || [])][0] || ""
    }));
}

function isPlanFocusQuestion(question = "") {
  const questionText = String(question).trim().toLowerCase();

  return (
    questionText.includes("monthly income payouts") ||
    (questionText.includes("long-term growth") &&
      questionText.includes("balance of both"))
  );
}

function isMonthlyPremiumBudgetQuestion(question = "") {
  return String(question).trim().toLowerCase().includes("premium budget");
}

function normalizeFieldName(fieldName = "", question = "") {
  if (isMonthlyPremiumBudgetQuestion(question)) {
    return "monthly_income";
  }

  if (isPlanFocusQuestion(question)) {
    return "main_goal";
  }

  const normalized = String(fieldName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  if (FIELD_LABELS[normalized]) {
    return normalized;
  }

  const readable = normalized.replace(/_/g, " ");

  return (
    Object.entries(FIELD_ALIASES).find(([, aliases]) =>
      aliases.some((alias) => readable.includes(alias))
    )?.[0] || normalized
  );
}

function getMissingInfoLabel(item) {
  if (isMonthlyPremiumBudgetQuestion(item.question)) {
    return "Monthly Premium Budget";
  }

  return FIELD_LABELS[normalizeFieldName(item.field_name, item.question)] || item.field_name;
}

function CustomerSummary() {
  const navigate = useNavigate();

  const customerId = localStorage.getItem("customer_id");

  const [summary, setSummary] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [missingAnswers, setMissingAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingMissingInfo, setSavingMissingInfo] = useState(false);
  const [savedMissingInfo, setSavedMissingInfo] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showMeetingWarning, setShowMeetingWarning] = useState(false);

  const hasMissingAnswers = Object.values(missingAnswers).some(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== ""
  );
  const discussionCategories = buildDiscussionCategories(summary);

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

  function updateMissingAnswer(fieldName, value, question) {
    const normalizedFieldName = normalizeFieldName(fieldName, question);

    setMissingAnswers((prev) => ({
      ...prev,
      [normalizedFieldName]: value
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
      setSavedMissingInfo(data.saved_info || []);
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

    const discussionCategoryText =
      discussionCategories.length === 0
        ? "No clear discussion categories detected yet."
        : discussionCategories
            .map(
              (item) =>
                `- ${item.title}: ${item.description} Advisor should clarify: ${item.advisorClarify}`
            )
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

Categories to Discuss with Advisor
${discussionCategoryText}

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

  function handleContinueToMeeting() {
    const missingCount = summary?.missing_info?.length || 0;

    if (missingCount >= 3) {
      setShowMeetingWarning(true);
      return;
    }

    navigate("/book-meeting");
  }

  function renderMissingInput(item) {
    const fieldName = normalizeFieldName(item.field_name, item.question);
    const value = missingAnswers[fieldName] || "";
    const onChange = (e) =>
      updateMissingAnswer(fieldName, e.target.value, item.question);

    if (fieldName === "monthly_income") {
      return (
        <input
          className="app-input"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) =>
            updateMissingAnswer(
              fieldName,
              e.target.value.replace(/\D/g, ""),
              item.question
            )
          }
          placeholder={
            isMonthlyPremiumBudgetQuestion(item.question)
              ? "Enter monthly premium budget"
              : "Enter monthly income"
          }
        />
      );
    }

    if (fieldName === "risk_appetite") {
      return (
        <select className="app-select" value={value} onChange={onChange}>
          <option value="">Select risk appetite</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="not_sure">Not sure</option>
        </select>
      );
    }

    if (fieldName === "main_goal" && !isPlanFocusQuestion(item.question)) {
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

    if (fieldName === "preferred_meeting_type") {
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
        type="text"
        value={value}
        onChange={onChange}
        placeholder={
          isPlanFocusQuestion(item.question)
            ? "Type income, growth, balance, or a number"
            : "Type your answer"
        }
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
        <CustomerJourneyStepper activeStep="Coverage Map" />
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
              <p>
                <strong>Existing Insurance:</strong>{" "}
                {summary.customer.existing_insurance || "Not provided"}
              </p>
              <p>
                <strong>Preferred Meeting Type:</strong>{" "}
                {summary.customer.preferred_meeting_type || "Not provided"}
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
            <h2>Categories to Discuss with an Advisor</h2>
            <p className="muted">
              Based on the overall Clarity conversation, profile details, and
              recorded question history.
            </p>

            {discussionCategories.length === 0 ? (
              <p className="muted" style={{ marginTop: "12px" }}>
                No clear category focus has been detected yet.
              </p>
            ) : (
              <div className="discussion-category-grid">
                {discussionCategories.map((item) => (
                  <article className="discussion-category-card" key={item.category}>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    {item.reason && (
                      <p className="source-note">
                        <strong>Why this appeared:</strong> {item.reason}
                      </p>
                    )}
                    <p className="source-note">
                      <strong>Advisor should clarify:</strong>{" "}
                      {item.advisorClarify}
                    </p>
                  </article>
                ))}
              </div>
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

            {savedMissingInfo.length > 0 && (
              <div className="details-grid" style={{ marginBottom: "16px" }}>
                {savedMissingInfo.map((item) => (
                  <p key={item.field_name}>
                    <strong>
                      {item.label ||
                        FIELD_LABELS[normalizeFieldName(item.field_name)] ||
                        item.field_name}
                      :
                    </strong>{" "}
                    {item.value}
                  </p>
                ))}
              </div>
            )}

            {summary.missing_info.length === 0 ? (
              <p className="muted">No missing information detected.</p>
            ) : (
              <form className="form-grid" onSubmit={saveMissingInfo}>
                {summary.missing_info.map((item, index) => (
                  <div className="card" key={item.missing_id || index}>
                    <h3 className="highlight">
                      {getMissingInfoLabel(item)}
                    </h3>
                    <p style={{ marginBottom: "10px" }}>{item.question}</p>
                    {renderMissingInput(item)}
                  </div>
                ))}

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={savingMissingInfo || !hasMissingAnswers}
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
          onClick={handleContinueToMeeting}
        >
          Continue to Clarity Meeting Booking
        </button>
      </div>

      {showMeetingWarning && (
        <div className="alert">
          <strong>Several important details are still missing.</strong>{" "}
          Continuing now may require your Prudential Financial Representative to
          spend more time collecting basic information during the meeting, which
          could slow down the discussion.
          <div className="button-row" style={{ marginTop: "12px" }}>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => navigate("/book-meeting")}
            >
              Continue anyway
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default CustomerSummary;
