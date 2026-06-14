import { useEffect, useState } from "react";

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
          method: "POST"
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
    <div
      style={{
        maxWidth: "1000px",
        margin: "40px auto",
        fontFamily: "Arial",
        padding: "0 20px"
      }}
    >
      <h1>Advisor Dashboard</h1>

      <p style={{ color: "#555" }}>
        This dashboard helps the Prudential Financial Representative prepare for
        the meeting using the customer profile, AI chat history, missing
        information, and product interest.
      </p>

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

      {loadingMeeting && <p>Loading meeting details...</p>}

      {meeting && (
        <div
          style={{
            border: "1px solid #ddd",
            padding: "18px",
            borderRadius: "10px",
            marginBottom: "20px",
            backgroundColor: "#fff"
          }}
        >
          <h2>Meeting Details</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px"
            }}
          >
            <p>
              <strong>Customer:</strong> {meeting.customer_name}
            </p>

            <p>
              <strong>Age:</strong> {meeting.age || "Not provided"}
            </p>

            <p>
              <strong>Occupation:</strong> {meeting.occupation || "Not provided"}
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
              <strong>Meeting Type:</strong> {meeting.meeting_type}
            </p>

            <p>
              <strong>Meeting Time:</strong> {meeting.meeting_datetime}
            </p>

            <p>
              <strong>Status:</strong> {meeting.status}
            </p>

            <p>
              <strong>Detected Product Interest:</strong>{" "}
              {meeting.product_interest}
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
        </div>
      )}

      {meeting && missingInfo.length > 0 && (
        <div
          style={{
            border: "2px solid #f59e0b",
            backgroundColor: "#fffbeb",
            padding: "18px",
            borderRadius: "10px",
            marginBottom: "20px"
          }}
        >
          <h2 style={{ color: "#92400e", marginTop: 0 }}>
            Missing Customer Information
          </h2>

          <p style={{ color: "#92400e" }}>
            The customer has not provided the following information. The advisor
            should clarify these before discussing suitability or next steps.
          </p>

          {missingInfo.map((item, index) => (
            <div
              key={item.missing_id || index}
              style={{
                padding: "12px",
                marginBottom: "10px",
                backgroundColor: "white",
                borderRadius: "8px",
                border: "1px solid #fcd34d"
              }}
            >
              <strong>
                {index + 1}. {item.field_name}
              </strong>

              <p style={{ margin: "6px 0 0 0" }}>{item.question}</p>
            </div>
          ))}
        </div>
      )}

      {meeting && missingInfo.length === 0 && (
        <div
          style={{
            border: "1px solid #86efac",
            backgroundColor: "#f0fdf4",
            padding: "18px",
            borderRadius: "10px",
            marginBottom: "20px"
          }}
        >
          <h2 style={{ color: "#166534", marginTop: 0 }}>
            Customer Profile Complete
          </h2>

          <p style={{ color: "#166534" }}>
            No major missing customer information was detected.
          </p>
        </div>
      )}

      <button
        onClick={generateSummary}
        disabled={loadingSummary || !meeting}
        style={{
          padding: "12px 18px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: loadingSummary || !meeting ? "#999" : "#dc2626",
          color: "white",
          cursor: loadingSummary || !meeting ? "not-allowed" : "pointer",
          marginBottom: "20px"
        }}
      >
        {loadingSummary
          ? "Generating AI Summary..."
          : "Generate Advisor Prep Summary"}
      </button>

      {summary && (
        <div
          style={{
            border: "1px solid #ddd",
            padding: "18px",
            borderRadius: "10px",
            backgroundColor: "#f9fafb",
            marginTop: "10px"
          }}
        >
          <h2>AI Advisor Preparation Pack</h2>

          <section style={{ marginBottom: "18px" }}>
            <h3>Customer Summary</h3>
            <p>{summary.customer_summary}</p>
          </section>

          <section style={{ marginBottom: "18px" }}>
            <h3>Product Interest</h3>
            <p>{summary.product_interest}</p>
          </section>

          <section style={{ marginBottom: "18px" }}>
            <h3>Questions Asked by Customer</h3>

            {summary.questions_asked.length === 0 ? (
              <p>No questions were recorded.</p>
            ) : (
              <ul>
                {summary.questions_asked.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ marginBottom: "18px" }}>
            <h3>Clarification Points</h3>

            {summary.clarification_points.length === 0 ? (
              <p>No clarification points were generated.</p>
            ) : (
              <ul>
                {summary.clarification_points.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ marginBottom: "18px" }}>
            <h3>Missing Information</h3>

            {summary.missing_info.length === 0 ? (
              <p>No missing information was included in the summary.</p>
            ) : (
              <ul>
                {summary.missing_info.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3>Advisor Checklist</h3>

            {summary.checklist.length === 0 ? (
              <p>No checklist items were generated.</p>
            ) : (
              summary.checklist.map((item, index) => (
                <label
                  key={index}
                  style={{
                    display: "block",
                    marginBottom: "10px",
                    padding: "10px",
                    backgroundColor: "white",
                    borderRadius: "6px",
                    border: "1px solid #ddd"
                  }}
                >
                  <input type="checkbox" style={{ marginRight: "8px" }} />
                  {item}
                </label>
              ))
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default AdvisorDashboard;