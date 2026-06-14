import { useState } from "react";
import { useNavigate } from "react-router-dom";

function BookMeeting() {
  const navigate = useNavigate();

  const customerId = localStorage.getItem("customer_id");

  const [message, setMessage] = useState(
    "I'm free next Friday afternoon and I prefer an online meeting."
  );

  const [recommendationData, setRecommendationData] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [error, setError] = useState("");

  async function handleRecommend(e) {
    e.preventDefault();

    if (!customerId) {
      setError("No customer profile found. Please create a profile first.");
      return;
    }

    if (!message.trim()) {
      setError("Please describe when you are free.");
      return;
    }

    setLoadingRecommendation(true);
    setRecommendationData(null);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/meetings/recommend-natural",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            customer_id: customerId,
            message: message.trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to get recommendation.");
      }

      setRecommendationData(data);
    } catch (error) {
      console.error("Recommend meeting error:", error);
      setError(error.message);
    } finally {
      setLoadingRecommendation(false);
    }
  }

  async function handleConfirmMeeting() {
    if (!customerId || !recommendationData?.recommendation?.slot_id) {
      setError("No meeting recommendation found.");
      return;
    }

    setLoadingConfirm(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/meetings/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customer_id: customerId,
          slot_id: recommendationData.recommendation.slot_id,
          product_interest:
            recommendationData.recommendation.product_interest ||
            "General Prudential ILP"
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to confirm meeting.");
      }

      localStorage.setItem("meeting_id", data.meeting_id);

      navigate("/advisor-dashboard");
    } catch (error) {
      console.error("Confirm meeting error:", error);
      setError(error.message);
    } finally {
      setLoadingConfirm(false);
    }
  }

  function formatDateTime(value) {
    if (!value) return "Not provided";

    try {
      const date = new Date(value);
      return date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return value;
    }
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
      <h1>AI Meeting Booking Agent</h1>

      <p style={{ color: "#555", lineHeight: "1.6" }}>
        Tell the AI when you are free. It will understand your schedule,
        detect your product interest, check advisor availability, and recommend
        the most suitable Prudential Financial Representative.
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
          No customer profile found. Please create a customer profile first.
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

      <form
        onSubmit={handleRecommend}
        style={{
          border: "1px solid #ddd",
          padding: "18px",
          borderRadius: "10px",
          backgroundColor: "#fff",
          marginBottom: "20px"
        }}
      >
        <h2>Describe Your Availability</h2>

        <p style={{ color: "#666" }}>
          Example: “I’m free next Friday afternoon and I prefer online.”
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us when you are free..."
          rows={5}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "15px",
            resize: "vertical",
            boxSizing: "border-box"
          }}
        />

        <div style={{ marginTop: "14px" }}>
          <button
            type="submit"
            disabled={loadingRecommendation || !customerId}
            style={{
              padding: "12px 18px",
              borderRadius: "8px",
              border: "none",
              backgroundColor:
                loadingRecommendation || !customerId ? "#999" : "#dc2626",
              color: "white",
              cursor:
                loadingRecommendation || !customerId ? "not-allowed" : "pointer"
            }}
          >
            {loadingRecommendation
              ? "AI is finding the best advisor..."
              : "Let AI Find Best Advisor"}
          </button>
        </div>
      </form>

      {recommendationData?.needs_clarification && (
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
            AI Needs More Information
          </h2>

          <p style={{ color: "#92400e" }}>
            {recommendationData.clarification_question}
          </p>

          <div
            style={{
              backgroundColor: "white",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #fcd34d"
            }}
          >
            <strong>AI extracted so far:</strong>

            <p>
              <strong>Meeting Type:</strong>{" "}
              {recommendationData.preferences?.meeting_type || "Unknown"}
            </p>

            <p>
              <strong>Date:</strong>{" "}
              {recommendationData.preferences?.preferred_date || "Not provided"}
            </p>

            <p>
              <strong>Time Range:</strong>{" "}
              {recommendationData.preferences?.preferred_start_time ||
                "Not provided"}{" "}
              -{" "}
              {recommendationData.preferences?.preferred_end_time ||
                "Not provided"}
            </p>
          </div>
        </div>
      )}

      {recommendationData?.no_slots_found && (
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
            No Advisor Slot Found
          </h2>

          <p style={{ color: "#92400e" }}>{recommendationData.message}</p>

          <div
            style={{
              backgroundColor: "white",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #fcd34d"
            }}
          >
            <p>
              <strong>Detected Product Interest:</strong>{" "}
              {recommendationData.product_interest?.product_category}
            </p>

            <p>
              <strong>AI understood availability:</strong>{" "}
              {recommendationData.preferences?.preferred_date},{" "}
              {recommendationData.preferences?.preferred_start_time} -{" "}
              {recommendationData.preferences?.preferred_end_time},{" "}
              {recommendationData.preferences?.meeting_type}
            </p>
          </div>
        </div>
      )}

      {recommendationData?.recommendation && (
        <div
          style={{
            border: "1px solid #ddd",
            padding: "18px",
            borderRadius: "10px",
            backgroundColor: "#f9fafb",
            marginBottom: "20px"
          }}
        >
          <h2>AI Recommended Meeting</h2>

          <div
            style={{
              border: "1px solid #bfdbfe",
              backgroundColor: "#eff6ff",
              padding: "14px",
              borderRadius: "8px",
              marginBottom: "18px"
            }}
          >
            <h3 style={{ marginTop: 0 }}>AI Understood Your Schedule</h3>

            <p>
              <strong>Meeting Type:</strong>{" "}
              {recommendationData.preferences?.meeting_type}
            </p>

            <p>
              <strong>Preferred Date:</strong>{" "}
              {recommendationData.preferences?.preferred_date}
            </p>

            <p>
              <strong>Preferred Time Range:</strong>{" "}
              {recommendationData.preferences?.preferred_start_time} -{" "}
              {recommendationData.preferences?.preferred_end_time}
            </p>

            <p>
              <strong>Duration:</strong>{" "}
              {recommendationData.preferences?.duration_minutes} minutes
            </p>
          </div>

          <div
            style={{
              border: "2px solid #86efac",
              backgroundColor: "#f0fdf4",
              padding: "16px",
              borderRadius: "10px",
              marginBottom: "18px"
            }}
          >
            <h3 style={{ color: "#166534", marginTop: 0 }}>
              Best Matched Advisor
            </h3>

            <p>
              <strong>Advisor:</strong>{" "}
              {recommendationData.recommendation.advisor_name}
            </p>

            <p>
              <strong>Email:</strong>{" "}
              {recommendationData.recommendation.advisor_email}
            </p>

            <p>
              <strong>Specialty:</strong>{" "}
              {recommendationData.recommendation.advisor_specialty}
            </p>

            <p>
              <strong>Location:</strong>{" "}
              {recommendationData.recommendation.advisor_location ||
                "Not provided"}
            </p>

            <p>
              <strong>Meeting Type:</strong>{" "}
              {recommendationData.recommendation.meeting_type}
            </p>

            <p>
              <strong>Start:</strong>{" "}
              {formatDateTime(recommendationData.recommendation.start_datetime)}
            </p>

            <p>
              <strong>End:</strong>{" "}
              {formatDateTime(recommendationData.recommendation.end_datetime)}
            </p>

            <p>
              <strong>Detected Product Interest:</strong>{" "}
              {recommendationData.recommendation.product_interest}
            </p>

            <p>
              <strong>Confidence:</strong>{" "}
              {recommendationData.recommendation.confidence}
            </p>
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              backgroundColor: "white",
              padding: "14px",
              borderRadius: "8px",
              marginBottom: "18px"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Why AI Selected This Advisor</h3>

            <p style={{ lineHeight: "1.6" }}>
              {recommendationData.recommendation.reason}
            </p>
          </div>

          {recommendationData.alternatives?.length > 0 && (
            <div
              style={{
                border: "1px solid #ddd",
                backgroundColor: "white",
                padding: "14px",
                borderRadius: "8px",
                marginBottom: "18px"
              }}
            >
              <h3 style={{ marginTop: 0 }}>Alternative Available Slots</h3>

              {recommendationData.alternatives.map((slot, index) => (
                <div
                  key={slot.slot_id || index}
                  style={{
                    padding: "10px",
                    borderBottom:
                      index === recommendationData.alternatives.length - 1
                        ? "none"
                        : "1px solid #eee"
                  }}
                >
                  <strong>{slot.full_name}</strong> — {slot.specialty}
                  <br />
                  {formatDateTime(slot.start_datetime)} to{" "}
                  {formatDateTime(slot.end_datetime)}
                  <br />
                  Score: {slot.score}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleConfirmMeeting}
            disabled={loadingConfirm}
            style={{
              padding: "12px 18px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: loadingConfirm ? "#999" : "#16a34a",
              color: "white",
              cursor: loadingConfirm ? "not-allowed" : "pointer"
            }}
          >
            {loadingConfirm ? "Confirming..." : "Confirm This Meeting"}
          </button>
        </div>
      )}

      <button
        onClick={() => navigate("/document-chat")}
        style={{
          padding: "10px 14px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          backgroundColor: "white",
          cursor: "pointer"
        }}
      >
        Back to Document Chat
      </button>
    </div>
  );
}

export default BookMeeting;