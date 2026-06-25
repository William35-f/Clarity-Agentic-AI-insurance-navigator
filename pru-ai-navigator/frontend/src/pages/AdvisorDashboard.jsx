import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function formatMeetingType(value) {
  return value === "Offline" ? "In-person" : value || "Not provided";
}

function AdvisorDashboard() {
  const [meeting, setMeeting] = useState(null);
  const [summary, setSummary] = useState(null);
  const [missingInfo, setMissingInfo] = useState([]);
  const [loadingMeeting, setLoadingMeeting] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState("");

  const meetingId = localStorage.getItem("meeting_id");

  useEffect(() => {
    async function fetchMeetingAndMissingInfo() {
      if (!meetingId) {
        setError("No meeting found. Please book a meeting first.");
        return;
      }

      setLoadingMeeting(true);
      setError("");

      try {
        const meetingResponse = await fetch(
          `http://localhost:5000/api/meetings/${meetingId}`
        );

        const meetingData = await meetingResponse.json();

        if (!meetingResponse.ok || !meetingData.success) {
          throw new Error(meetingData.message || "Failed to load meeting.");
        }

        setMeeting(meetingData.data);

        const customerId = meetingData.data.customer_id;

        const missingResponse = await fetch(
          `http://localhost:5000/api/customers/${customerId}/missing-info`
        );

        const missingData = await missingResponse.json();

        if (missingData.success) {
          setMissingInfo(missingData.data);
        }
      } catch (error) {
        console.error("Advisor dashboard load error:", error);
        setError(error.message);
      } finally {
        setLoadingMeeting(false);
      }
    }

    fetchMeetingAndMissingInfo();
  }, [meetingId]);

  async function generateSummary() {
    if (!meetingId) return;

    setLoadingSummary(true);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/advisor/meetings/${meetingId}/generate-summary`,
        {
          method: "POST",
          headers: {
            "x-demo-role": "advisor"
          }
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to generate summary.");
      }

      setSummary(data.data);
    } catch (error) {
      console.error("Generate summary error:", error);
      setError(error.message);
    } finally {
      setLoadingSummary(false);
    }
  }

  return (
    <main className="app-page">
      <header className="page-header">
        <div className="view-badge">Advisor View</div>
        <p className="page-kicker">Clarity prep pack</p>
        <h1>Advisor Dashboard</h1>
        <p className="lead">
          This dashboard helps the Prudential Financial Representative prepare
          for the meeting using the customer profile, Clarity chat history, missing
          information, and product interest.
        </p>
      </header>

      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loadingMeeting && <p className="muted">Loading meeting details...</p>}

      {meeting && (
        <section className="card">
          <h2>Meeting Details</h2>
          <div className="details-grid">
            <p>
              <strong>Customer:</strong> {meeting.customer_name}
            </p>
            <p>
              <strong>Age:</strong> {meeting.age || "Not provided"}
            </p>
            <p>
              <strong>Occupation:</strong>{" "}
              {meeting.occupation || "Not provided"}
            </p>
            <p>
              <strong>Monthly Income:</strong>{" "}
              {meeting.monthly_income || "Not provided"}
            </p>
            <p>
              <strong>Main Goal:</strong> {meeting.main_goal || "Not provided"}
            </p>
            <p>
              <strong>Risk Appetite:</strong>{" "}
              {meeting.risk_appetite || "Not provided"}
            </p>
            <p>
              <strong>Existing Insurance:</strong>{" "}
              {meeting.existing_insurance || "Not provided"}
            </p>
            <p>
              <strong>Meeting Type:</strong> {formatMeetingType(meeting.meeting_type)}
            </p>
            <p>
              <strong>Meeting Time:</strong> {meeting.meeting_datetime}
            </p>
            <p>
              <strong>Meeting End:</strong>{" "}
              {meeting.end_datetime || "Not provided"}
            </p>
            <p>
              <strong>Location / Details:</strong>{" "}
              {meeting.meeting_location?.label || "Not provided"}
              {meeting.meeting_location?.details
                ? ` - ${meeting.meeting_location.details}`
                : ""}
            </p>
            <p>
              <strong>Status:</strong> {meeting.status}
            </p>
            <p>
              <strong>Detected Product Interest:</strong>{" "}
              <span className="highlight">{meeting.product_interest}</span>
            </p>
            <p>
              <strong>Matched Advisor:</strong> {meeting.advisor_name}
            </p>
            <p>
              <strong>Advisor Specialty:</strong> {meeting.advisor_specialty}
            </p>
            <p>
              <strong>Advisor Location:</strong>{" "}
              {meeting.advisor_location || "Not provided"}
            </p>
          </div>
        </section>
      )}

      {meeting && missingInfo.length > 0 && (
        <section className="card section-card">
          <h2>
            Missing Customer <span className="highlight">Information</span>
          </h2>
          <p className="muted">
            The customer has not provided the following information. The advisor
            should clarify these before discussing suitability or next steps.
          </p>

          <div className="card-grid" style={{ marginTop: "16px" }}>
            {missingInfo.map((item, index) => (
              <div className="card" key={item.missing_id || index}>
                <h3 className="highlight">
                  {index + 1}. {item.field_name}
                </h3>
                <p>{item.question}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {meeting && missingInfo.length === 0 && (
        <div className="alert alert-success">
          <strong>Customer Profile Complete.</strong> No major missing customer
          information was detected.
        </div>
      )}

      <div className="button-row" style={{ marginBottom: "20px" }}>
        <button
          className="btn btn-primary"
          onClick={generateSummary}
          disabled={loadingSummary || !meeting}
        >
          {loadingSummary
            ? "Generating Clarity Summary..."
            : "Generate Advisor Prep Summary"}
        </button>
        <Link
          className="btn"
          to={`/advisor/meeting-assistant?meeting_id=${meetingId || ""}`}
        >
          Open Meeting Assistant
        </Link>
      </div>

      {summary && (
        <section className="card section-card">
          <h2>Clarity Advisor Preparation Pack</h2>

          <section className="prep-section">
            <h3>Customer Summary</h3>
            <p>{summary.customer_summary}</p>
          </section>

          <section className="prep-section">
            <h3>Product Interest</h3>
            <p className="highlight">{summary.product_interest}</p>
          </section>

          <section className="prep-section">
            <h3>Questions Asked by Customer</h3>
            {summary.questions_asked.length === 0 ? (
              <p className="muted">No questions were recorded.</p>
            ) : (
              <ul>
                {summary.questions_asked.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="prep-section">
            <h3>Clarification Points</h3>
            {summary.clarification_points.length === 0 ? (
              <p className="muted">No clarification points were generated.</p>
            ) : (
              <ul>
                {summary.clarification_points.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="prep-section">
            <h3>Missing Information</h3>
            {summary.missing_info.length === 0 ? (
              <p className="muted">
                No missing information was included in the summary.
              </p>
            ) : (
              <ul>
                {summary.missing_info.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="prep-section">
            <h3>Advisor Checklist</h3>
            {summary.checklist.length === 0 ? (
              <p className="muted">No checklist items were generated.</p>
            ) : (
              summary.checklist.map((item, index) => (
                <label className="checklist-item" key={index}>
                  <input type="checkbox" />
                  <span>{item}</span>
                </label>
              ))
            )}
          </section>
        </section>
      )}
    </main>
  );
}

export default AdvisorDashboard;
