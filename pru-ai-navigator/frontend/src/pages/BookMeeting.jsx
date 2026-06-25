import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerJourneyStepper from "../components/CustomerJourneyStepper";

const suggestionChips = [
  "Morning slots this week",
  "Afternoon slots this week",
  "Evening slots this week",
  "Any available slot",
  "Online meeting",
  "In-person meeting"
];

function formatValue(value) {
  return value || "Not provided";
}

function formatMeetingType(value) {
  if (!value || value === "unclear") return "Not specified yet";
  return value === "Offline" ? "In-person" : value || "Not provided";
}

function previewTimePreferenceFromText(value) {
  const text = value.toLowerCase();
  const dayMatches = [];

  if (text.includes("friday")) dayMatches.push("Friday");
  if (text.includes("saturday")) dayMatches.push("Saturday");
  if (text.includes("sunday")) dayMatches.push("Sunday");
  if (text.includes("weekend")) dayMatches.push("weekend");

  if (
    text.includes("any") ||
    text.includes("flexible") ||
    text.includes("earliest") ||
    text.includes("soonest") ||
    text.includes("as soon as possible") ||
    text.includes("whatever is available")
  ) {
    return "Any available slot";
  }

  if (text.includes("morning")) {
    return dayMatches.length > 0
      ? `${dayMatches.join(" or ")} morning`
      : "Morning slots this week";
  }

  if (text.includes("afternoon")) {
    return dayMatches.length > 0
      ? `${dayMatches.join(" or ")} afternoon`
      : "Afternoon slots this week";
  }

  if (text.includes("evening")) {
    return dayMatches.length > 0
      ? `${dayMatches.join(" or ")} evening`
      : "Evening slots this week";
  }

  if (dayMatches.length > 0) {
    return `${dayMatches.join(" or ")} this week`;
  }

  return "Not specified yet";
}

function previewMeetingTypeFromText(value) {
  const text = value.toLowerCase();

  if (text.includes("online") || text.includes("teams")) return "Online";

  if (
    text.includes("in-person") ||
    text.includes("in person") ||
    text.includes("offline") ||
    text.includes("physical")
  ) {
    return "In-person";
  }

  return "Not specified yet";
}

function BookMeeting() {
  const navigate = useNavigate();

  const customerId = localStorage.getItem("customer_id");

  const [message, setMessage] = useState("");
  const [recommendationData, setRecommendationData] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [scheduledMeeting, setScheduledMeeting] = useState(null);
  const [error, setError] = useState("");

  const understandingPreview = useMemo(() => {
    const trimmedMessage = message.trim();
    return {
      requestedTimePreference: previewTimePreferenceFromText(message),
      meetingType: previewMeetingTypeFromText(message),
      searchWindow: "Next 7 days",
      notes: trimmedMessage
        ? `Live preview from your text: "${trimmedMessage}"`
        : "Type your availability to preview what Clarity will compare with real advisor slots."
    };
  }, [message]);

  function updateMessage(value) {
    setMessage(value);
    setRecommendationData(null);
    setScheduledMeeting(null);
    setError("");
  }

  function applySuggestionChip(chip) {
    setMessage((current) => {
      const trimmed = current.trim();

      if (!trimmed) {
        return chip;
      }

      if (trimmed.toLowerCase().includes(chip.toLowerCase())) {
        return current;
      }

      return `${trimmed}; ${chip}`;
    });
    setRecommendationData(null);
    setScheduledMeeting(null);
    setError("");
  }

  function getFriendlyError(rawMessage) {
    const normalized = String(rawMessage || "").toLowerCase();

    if (normalized.includes("no available slots") || normalized.includes("no advisors")) {
      return "We could not find a suitable advisor slot in the next 7 days from the current demo data. Try a different time preference or meeting type.";
    }

    if (normalized.includes("required") || normalized.includes("describe")) {
      return "Please describe your preferred meeting time before Clarity checks advisor availability.";
    }

    if (normalized.includes("customer")) {
      return "No customer profile found. Please create a profile first.";
    }

    return "We could not check advisor availability right now. Try again in a moment.";
  }

  async function handleRecommend(e) {
    e.preventDefault();

    if (!customerId) {
      setError("No customer profile found. Please create a profile first.");
      return;
    }

    if (!message.trim()) {
      setError("Please describe your preferred meeting time before Clarity checks advisor availability.");
      return;
    }

    setLoadingRecommendation(true);
    setRecommendationData(null);
    setScheduledMeeting(null);
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
      setError(getFriendlyError(error.message));
    } finally {
      setLoadingRecommendation(false);
    }
  }

  async function handleConfirmSlot(slot) {
    if (!customerId || !slot?.slot_id) {
      setError("No meeting slot selected.");
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
          slot_id: slot.slot_id,
          ai_reason: slot.match_reason || recommendationData?.ai_decision?.advisor_reason,
          product_interest:
            recommendationData?.product_interest ||
            slot.product_interest ||
            "General Prudential ILP"
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to confirm meeting.");
      }

      localStorage.setItem("meeting_id", data.meeting_id);
      setScheduledMeeting(data.data || null);
    } catch (error) {
      console.error("Confirm meeting error:", error);
      setError(getFriendlyError(error.message));
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

  function getDetectedInterest() {
    const interest =
      recommendationData?.product_interest ||
      recommendationData?.recommendation?.product_interest;

    if (!interest) return "General Prudential ILP";

    if (typeof interest === "string") {
      return interest;
    }

    return interest.product_category || "General Prudential ILP";
  }

  function downloadMeetingDetails() {
    if (!scheduledMeeting) return;

    const location = scheduledMeeting.location || {};
    const content = [
      "Meeting title: CLARITY Prudential Financial Representative Meeting",
      `Customer name: ${scheduledMeeting.customer_name || "Not provided"}`,
      `Advisor name: ${scheduledMeeting.advisor_name || "Not provided"}`,
      `Advisor specialisation: ${scheduledMeeting.advisor_specialty || "Not provided"}`,
      `Start datetime: ${scheduledMeeting.start_datetime || "Not provided"}`,
      `End datetime: ${scheduledMeeting.end_datetime || "Not provided"}`,
      `Meeting type: ${formatMeetingType(scheduledMeeting.meeting_type)}`,
      `Location: ${location.label || "Not provided"}`,
      location.details ? `Location details: ${location.details}` : "",
      `AI reason for match: ${scheduledMeeting.ai_reason || "Not provided"}`,
      "Note: This meeting was scheduled through the CLARITY demo.",
      "Final recommendations should be made by the Prudential Financial Representative."
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "clarity-meeting-details.txt";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const hasRecommendation = Boolean(recommendationData?.recommendation);
  const noSlotsFound =
    recommendationData?.recommendation_type === "no_slots" ||
    recommendationData?.no_slots_found;

  return (
    <main className="app-page">
      <header className="page-header meeting-hero">
        <div className="view-badge">Customer View</div>
        <p className="page-kicker">Clarity advisor matching</p>
        <h1>Book Your Meeting with Clarity</h1>
        <p className="lead">
          Clarity uses AI to understand your availability and match it with real
          advisor slots in the next 7 days.
        </p>
        <CustomerJourneyStepper activeStep="Meeting Scheduling" />
      </header>

      {!customerId && (
        <div className="alert">
          <strong>No customer profile found.</strong> Please create a customer
          profile first.
          <div className="button-row" style={{ marginTop: "12px" }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/customer-profile")}
              type="button"
            >
              Go to Customer Profile
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="alert">
          <strong>Could not continue:</strong> {error}
        </div>
      )}

      <div className="meeting-booking-grid">
        <form className="card form-grid meeting-availability-card" onSubmit={handleRecommend}>
          <div>
            <h2>Choose your preferred meeting time</h2>
            <p className="muted">
              Advisor slots are available over the next 7 days. Type naturally
              or choose a time preference below.
            </p>
            <p className="muted">
              Example: "I'm free this week in the afternoon and I prefer an
              online meeting."
            </p>
          </div>

          <div className="suggestions meeting-suggestions" aria-label="Availability suggestions">
            {suggestionChips.map((chip) => (
              <button
                className="btn btn-outline suggestion-chip"
                key={chip}
                type="button"
                onClick={() => applySuggestionChip(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          <textarea
            className="app-textarea"
            value={message}
            onChange={(e) => updateMessage(e.target.value)}
            placeholder="Example: I'm free in the next 7 days, preferably weekday evenings and online."
            rows={7}
          />

          <div className="button-row">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loadingRecommendation || !customerId}
            >
              {loadingRecommendation
                ? "Clarity is checking advisor availability..."
                : "Match Me with an Advisor"}
            </button>
          </div>
        </form>

        <aside className="card meeting-side-card">
          <section className="meeting-panel-section">
            <h2>What Clarity understood</h2>
            <p className="muted">
              This is a preference preview, not a confirmed booking.
            </p>
            <div className="meeting-preview-list">
              <p>
                <strong>Requested time preference</strong>
                <span>{understandingPreview.requestedTimePreference}</span>
              </p>
              <p>
                <strong>Search window</strong>
                <span>{understandingPreview.searchWindow}</span>
              </p>
              <p>
                <strong>Meeting type</strong>
                <span>{understandingPreview.meetingType}</span>
              </p>
              <p>
                <strong>Notes</strong>
                <span>{understandingPreview.notes}</span>
              </p>
            </div>
          </section>

          <section className="meeting-panel-section">
            <h2>How Clarity matches</h2>
            <p className="muted">
              Clarity uses AI to search advisor slots within the next 7 days
              and tries to match your preferred time, meeting type, and product
              interest.
            </p>
            <ul className="compact-list">
              <li>Searches available slots in the next 7 days</li>
              <li>Matches your preferred time of day</li>
              <li>Checks your preferred meeting type</li>
              <li>Considers your product interest if available</li>
              <li>Suggests a suitable Prudential Financial Representative</li>
            </ul>
          </section>
        </aside>
      </div>

      {!recommendationData && !loadingRecommendation && (
        <section className="card meeting-result-card">
          <h2>Suggested Advisor Slot</h2>
          <p className="muted">
            Your suggested advisor slot will appear here after Clarity checks
            availability within the next 7 days.
          </p>
        </section>
      )}

      {recommendationData?.needs_clarification && (
        <section className="card meeting-result-card">
          <h2>What Clarity Needs Next</h2>
          <p className="highlight">{recommendationData.clarification_question}</p>
          <div className="meeting-preview-list meeting-preview-list--inline">
            <p>
              <strong>Meeting type</strong>
              <span>
                {formatValue(
                  recommendationData.understood_availability?.meeting_type
                )}
              </span>
            </p>
            <p>
              <strong>Time preference</strong>
              <span>
                {formatValue(
                  recommendationData.understood_availability?.time_preference
                )}
              </span>
            </p>
            <p>
              <strong>Clarity understood</strong>
              <span>
                {formatValue(recommendationData.understood_availability?.summary)}
              </span>
            </p>
          </div>
        </section>
      )}

      {noSlotsFound && (
        <section className="card meeting-result-card">
          <h2>No Suitable Slot Found</h2>
          <p className="highlight">
            We could not find a suitable advisor slot in the next 7 days from
            the current demo data. Try a different time preference or meeting
            type.
          </p>
          <div className="meeting-preview-list meeting-preview-list--inline">
            <p>
              <strong>Detected product interest</strong>
              <span>{getDetectedInterest()}</span>
            </p>
            <p>
              <strong>Clarity understood</strong>
              <span>
                {recommendationData.understood_availability?.summary ||
                  "No matching slot was available."}
              </span>
            </p>
          </div>
        </section>
      )}

      {hasRecommendation && (
        <section className="card meeting-result-card">
          <div className="meeting-result-header">
            <div>
              <h2>Suggested Advisor Slot</h2>
              <p className="muted">
                This suggestion is based on available advisor slots in the next
                7 days. Your Financial Representative can confirm the final
                meeting details.
              </p>
            </div>
            <span className="tag">{recommendationData.recommendation.meeting_type}</span>
          </div>

          <div className="meeting-result-layout">
            <div className="meeting-result-primary">
              <h3>{recommendationData.recommendation.advisor_name}</h3>
              <p className="metric-text">{recommendationData.recommendation.specialty}</p>
              <p>{recommendationData.recommendation.match_reason}</p>
              {recommendationData.understood_availability
                ?.used_profile_meeting_type && (
                <p className="source-note">
                  Meeting type was not specified, so Clarity used your profile
                  preference:{" "}
                  {
                    recommendationData.understood_availability
                      .profile_meeting_type_used
                  }
                  .
                </p>
              )}
              {!recommendationData.recommendation.is_specialist && (
                <p className="source-note">
                  This advisor may not specialize in {getDetectedInterest()}, but
                  they are a suitable available advisor for your requested time.
                </p>
              )}
            </div>

            <div className="meeting-preview-list">
              <p>
                <strong>Advisor</strong>
                <span>{recommendationData.recommendation.advisor_name}</span>
              </p>
              <p>
                <strong>Specialisation</strong>
                <span>{recommendationData.recommendation.specialty}</span>
              </p>
              <p>
                <strong>Suggested slot</strong>
                <span>{formatDateTime(recommendationData.recommendation.start_datetime)}</span>
              </p>
              <p>
                <strong>Meeting type</strong>
                <span>{formatMeetingType(recommendationData.recommendation.meeting_type)}</span>
              </p>
              <p>
                <strong>Location/details</strong>
                <span>
                  {recommendationData.recommendation.location?.label ||
                    "Final details can be confirmed by the Financial Representative."}
                </span>
              </p>
            </div>
          </div>

          <div className="meeting-preview-list meeting-preview-list--inline">
            <p>
              <strong>Clarity understood</strong>
              <span>
                {recommendationData.understood_availability?.summary ||
                  "Clarity interpreted your availability against available slots."}
              </span>
            </p>
            <p>
              <strong>AI match reason</strong>
              <span>{recommendationData.message}</span>
            </p>
          </div>

          <section className="prep-section">
            <h3>Why Clarity suggested this slot</h3>
            <p>
              {recommendationData.ai_decision?.advisor_reason ||
                recommendationData.recommendation.match_reason}
            </p>
          </section>

          <div className="button-row">
            <button
              className="btn btn-primary"
              onClick={() => handleConfirmSlot(recommendationData.recommendation)}
              disabled={loadingConfirm}
              type="button"
            >
              {loadingConfirm ? "Confirming..." : "Confirm Meeting"}
            </button>
          </div>

          {recommendationData.specialist_next_available?.length > 0 && (
            <AlternativeSlots
              title="Matching-Specialty Slots"
              slots={recommendationData.specialist_next_available}
              loadingConfirm={loadingConfirm}
              onConfirmSlot={handleConfirmSlot}
            />
          )}

          {recommendationData.closest_available_slots?.length > 0 && (
            <AlternativeSlots
              title="Other Available Slots"
              slots={recommendationData.closest_available_slots}
              loadingConfirm={loadingConfirm}
              onConfirmSlot={handleConfirmSlot}
            />
          )}
        </section>
      )}

      {scheduledMeeting && (
        <section className="card meeting-result-card">
          <h2>Scheduled Meeting Details</h2>
          <p className="muted">
            Final meeting details can be confirmed by the Financial
            Representative.
          </p>
          <div className="meeting-preview-list meeting-preview-list--inline">
            <p>
              <strong>Advisor</strong>
              <span>{scheduledMeeting.advisor_name}</span>
            </p>
            <p>
              <strong>Specialisation</strong>
              <span>{scheduledMeeting.advisor_specialty}</span>
            </p>
            <p>
              <strong>Date</strong>
              <span>{formatDateTime(scheduledMeeting.start_datetime)}</span>
            </p>
            <p>
              <strong>End time</strong>
              <span>{formatDateTime(scheduledMeeting.end_datetime)}</span>
            </p>
            <p>
              <strong>Meeting type</strong>
              <span>{formatMeetingType(scheduledMeeting.meeting_type)}</span>
            </p>
            <p>
              <strong>Location/details</strong>
              <span>
                {scheduledMeeting.location?.label}
                {scheduledMeeting.location?.details
                  ? ` - ${scheduledMeeting.location.details}`
                  : ""}
              </span>
            </p>
            <p>
              <strong>AI reason for match</strong>
              <span>{scheduledMeeting.ai_reason || "Not provided"}</span>
            </p>
            <p>
              <strong>Demo note</strong>
              <span>
                {scheduledMeeting.location?.note ||
                  "This meeting was scheduled through the CLARITY demo."}
              </span>
            </p>
          </div>
          <div className="button-row" style={{ marginTop: "16px" }}>
            <button className="btn btn-primary" type="button" onClick={downloadMeetingDetails}>
              Download Meeting Details
            </button>
          </div>
        </section>
      )}

      <button className="btn" onClick={() => navigate("/document-chat")} type="button">
        Back to AI Interview
      </button>
    </main>
  );
}

function AlternativeSlots({ title, slots, loadingConfirm, onConfirmSlot }) {
  return (
    <div className="alternative-slots">
      <h3>{title}</h3>
      <div className="alternative-slot-grid">
        {slots.map((slot) => (
          <div className="alternative-slot" key={slot.slot_id}>
            <strong>{slot.advisor_name}</strong>
            <span>{slot.specialty}</span>
            <span>{slot.display_time}</span>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => onConfirmSlot(slot)}
              disabled={loadingConfirm}
            >
              Confirm Meeting
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BookMeeting;
