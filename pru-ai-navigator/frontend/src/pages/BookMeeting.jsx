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
        throw new Error(
          data.error || data.message || "Failed to get recommendation."
        );
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
    <main className="app-page">
      <header className="page-header">
        <p className="page-kicker">Clarity advisor matching</p>
        <h1>Clarity Meeting Booking</h1>
        <p className="lead">
          Tell Clarity when you are free. It understands your schedule, detects
          product interest, checks advisor availability, and recommends a
          suitable Prudential Financial Representative.
        </p>
      </header>

      {!customerId && (
        <div className="alert">
          <strong>No customer profile found.</strong> Please create a customer
          profile first.
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

      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <form className="card form-grid" onSubmit={handleRecommend}>
        <h2>Describe Your Availability</h2>
        <p className="muted">
          Example: "I'm free next Friday afternoon and I prefer online."
        </p>

        <textarea
          className="app-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us when you are free..."
          rows={5}
        />

        <div className="button-row">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loadingRecommendation || !customerId}
          >
            {loadingRecommendation
              ? "Clarity is finding the best advisor..."
              : "Let Clarity Find Best Advisor"}
          </button>
        </div>
      </form>

      {recommendationData?.needs_clarification && (
        <section className="card section-card">
          <h2>
            Clarity Needs <span className="highlight">More Information</span>
          </h2>
          <p className="highlight">{recommendationData.clarification_question}</p>

          <div className="card" style={{ marginTop: "16px", marginBottom: 0 }}>
            <h3>Clarity extracted so far</h3>
            <div className="details-grid">
              <p>
                <strong>Meeting Type:</strong>{" "}
                {recommendationData.preferences?.meeting_type || "Unknown"}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {recommendationData.preferences?.preferred_date ||
                  "Not provided"}
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
        </section>
      )}

      {recommendationData?.no_slots_found && (
        <section className="card section-card">
          <h2>
            No Advisor <span className="highlight">Slot Found</span>
          </h2>
          <p className="highlight">{recommendationData.message}</p>

          <div className="card" style={{ marginTop: "16px", marginBottom: 0 }}>
            <div className="details-grid">
              <p>
                <strong>Detected Product Interest:</strong>{" "}
                {recommendationData.product_interest?.product_category}
              </p>
              <p>
                <strong>Clarity understood availability:</strong>{" "}
                {recommendationData.preferences?.preferred_date},{" "}
                {recommendationData.preferences?.preferred_start_time} -{" "}
                {recommendationData.preferences?.preferred_end_time},{" "}
                {recommendationData.preferences?.meeting_type}
              </p>
            </div>
          </div>
        </section>
      )}

      {recommendationData?.recommendation && (
        <section className="card section-card">
          <h2>Clarity Recommended Meeting</h2>

          <div className="card">
            <h3>Clarity Understood Your Schedule</h3>
            <div className="details-grid">
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
          </div>

          <div className="card">
            <h3>
              Best Matched <span className="highlight">Advisor</span>
            </h3>
            <div className="details-grid">
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
                <span className="highlight">
                  {recommendationData.recommendation.product_interest}
                </span>
              </p>
              <p>
                <strong>Confidence:</strong>{" "}
                {recommendationData.recommendation.confidence}
              </p>
            </div>
          </div>

          <div className="card">
            <h3>Why Clarity Selected This Advisor</h3>
            <p>{recommendationData.recommendation.reason}</p>
          </div>

          {recommendationData.alternatives?.length > 0 && (
            <div className="card">
              <h3>Alternative Available Slots</h3>
              {recommendationData.alternatives.map((slot, index) => (
                <div
                  className="prep-section"
                  key={slot.slot_id || index}
                >
                  <strong>{slot.full_name}</strong> - {slot.specialty}
                  <br />
                  {formatDateTime(slot.start_datetime)} to{" "}
                  {formatDateTime(slot.end_datetime)}
                  <br />
                  <span className="highlight">Score: {slot.score}</span>
                </div>
              ))}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleConfirmMeeting}
            disabled={loadingConfirm}
          >
            {loadingConfirm ? "Confirming..." : "Confirm This Meeting"}
          </button>
        </section>
      )}

      <button className="btn" onClick={() => navigate("/document-chat")}>
        Back to Document Chat
      </button>
    </main>
  );
}

export default BookMeeting;
