import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerJourneyStepper from "../components/CustomerJourneyStepper";

const openingMessageText =
  "Hi, I'm Clarity. I'll help you understand your insurance needs before your meeting. I can explain coverage, compare Prudential product categories, and save useful questions for your Financial Representative. What would you like to understand first?";

const openingMessage = {
  role: "assistant",
  message: openingMessageText
};

const primaryQuickPrompts = [
  {
    label: "I'm not sure what I need",
    message:
      "I'm not sure what type of insurance coverage I need. Can you guide me through the main areas?"
  },
  {
    label: "I want to protect my family",
    message:
      "I want to protect my family financially. What should I think about before speaking with my advisor?"
  },
  {
    label: "I want medical coverage",
    message:
      "I want to understand medical coverage and health protection. What should I clarify?"
  },
  {
    label: "I want to grow my wealth",
    message:
      "I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?"
  }
];

const secondaryQuickPrompts = [
  {
    label: "What should I ask my advisor?",
    message:
      "What questions should I ask my Prudential Financial Representative during the meeting?"
  },
  {
    label: "Check what info is missing",
    message:
      "What information is still missing from my profile before my advisor meeting?"
  }
];

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getCategoryStatuses(customer) {
  const goal = normalizeText(customer?.main_goal);
  const insurance = normalizeText(customer?.existing_insurance);

  return [
    {
      name: "Health Protection",
      status:
        insurance.includes("hospital") || insurance.includes("health")
          ? "Possible priority"
          : "Unclear"
    },
    {
      name: "Life Protection",
      status:
        goal.includes("protection") || insurance.includes("life")
          ? "Priority"
          : "Possible priority"
    },
    {
      name: "Wealth Accumulation",
      status: goal.includes("wealth") || goal.includes("grow") ? "Priority" : "Later"
    },
    {
      name: "Legacy Planning",
      status:
        goal.includes("retirement") || goal.includes("legacy")
          ? "Possible priority"
          : "Not enough info"
    }
  ];
}

function DocumentChat() {
  const navigate = useNavigate();
  const introTypingTimerRef = useRef(null);

  const [missingInfo] = useState(() => {
    const savedMissingInfo = localStorage.getItem("missing_info");

    if (!savedMissingInfo) return [];

    try {
      return JSON.parse(savedMissingInfo);
    } catch {
      return [];
    }
  });
  const [customer, setCustomer] = useState(null);
  const [question, setQuestion] = useState("");
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [savedForAdvisor, setSavedForAdvisor] = useState([]);
  const [introTyping, setIntroTyping] = useState(false);
  const [explanationMode, setExplanationMode] = useState("simple");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSummaryWarning, setShowSummaryWarning] = useState(false);

  const customerId = localStorage.getItem("customer_id");
  const categoryStatuses = getCategoryStatuses(customer);
  const meaningfulSavedForAdvisor = savedForAdvisor.filter(
    (item) =>
      item !== "Customer has started the Clarity AI interview." &&
      !item.startsWith("Quick prompt used:")
  );
  const latestNextQuestion = [...messages]
    .reverse()
    .find(
      (msg) =>
        msg.role === "assistant" &&
        Array.isArray(msg.next_best_questions) &&
        msg.next_best_questions.length > 0
    )?.next_best_questions?.[0];
  const unclearItems = [
    !customer?.main_goal ? "Main financial goal" : "",
    !customer?.monthly_income ? "Budget comfort" : "",
    !customer?.existing_insurance ? "Current coverage details" : "",
    "Dependents",
    "Health concerns"
  ].filter(Boolean);

  useEffect(() => {
    async function loadCustomer() {
      if (!customerId) return;

      try {
        const response = await fetch(`http://localhost:5000/api/customers/${customerId}`);
        const data = await response.json();

        if (data.success) {
          setCustomer(data.data);
        }
      } catch (loadError) {
        console.error("Load customer profile for chat error:", loadError);
      }
    }

    loadCustomer();
  }, [customerId]);

  useEffect(
    () => () => {
      if (introTypingTimerRef.current) {
        clearInterval(introTypingTimerRef.current);
      }
    },
    []
  );

  function saveAdvisorItems(items) {
    const cleaned = items
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    if (cleaned.length === 0) return;

    setSavedForAdvisor((prev) => [...new Set([...prev, ...cleaned])]);
  }

  function handleStartChatting() {
    if (!customerId) {
      setError("No customer profile found. Please create a profile first.");
      return;
    }

    if (introTypingTimerRef.current) {
      clearInterval(introTypingTimerRef.current);
    }

    setChatStarted(true);
    setMessages([{ ...openingMessage, message: "", isTyping: true }]);
    saveAdvisorItems(["Customer has started the Clarity AI interview."]);
    setIntroTyping(true);
    setError("");

    let nextCharacterIndex = 0;
    introTypingTimerRef.current = setInterval(() => {
      nextCharacterIndex += 3;
      const typedMessage = openingMessageText.slice(0, nextCharacterIndex);

      setMessages([
        {
          ...openingMessage,
          message: typedMessage,
          isTyping: nextCharacterIndex < openingMessageText.length
        }
      ]);

      if (nextCharacterIndex >= openingMessageText.length) {
        clearInterval(introTypingTimerRef.current);
        introTypingTimerRef.current = null;
        setIntroTyping(false);
      }
    }, 22);
  }

  async function submitQuestion(rawQuestion, savedNote) {
    const userQuestion = rawQuestion.trim();

    if (introTyping) return;

    if (!userQuestion) {
      setError("Please enter a question for Clarity.");
      return;
    }

    if (!customerId) {
      setError("No customer profile found. Please create a profile first.");
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        message: userQuestion,
        saved_for_advisor: true
      }
    ]);

    saveAdvisorItems([savedNote || `Customer asked: ${userQuestion}`]);
    setQuestion("");
    setLoading(true);
    setError("");
    setShowSummaryWarning(false);

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

      const advisorItems = [
        data.advisor_note,
        ...(data.concern_tags || []).map((tag) => `Concern identified: ${tag}`),
        ...(data.missing_customer_info || []).map(
          (item) => `Missing information: ${item.question || item.field_name}`
        )
      ];

      saveAdvisorItems(advisorItems);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          message: data.answer,
          source_note:
            data.source_note ||
            "Based on the Clarity Product Knowledge Document.",
          related_product: data.related_product,
          product_shortlist: data.product_shortlist || [],
          next_best_questions: data.next_best_questions || [],
          missing_customer_info: data.missing_customer_info || [],
          advisor_note: data.advisor_note || "",
          concern_tags: data.concern_tags || [],
          saved_for_advisor: advisorItems.some(Boolean)
        }
      ]);
    } catch (chatError) {
      console.error("Chat error:", chatError);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          message:
            "Sorry, Clarity is not working right now. Please check the backend terminal error.",
          source_note: "Source unavailable because the backend request failed."
        }
      ]);

      setError(chatError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleAskQuestion(e) {
    e.preventDefault();
    submitQuestion(question);
  }

  function handleQuickPrompt(prompt) {
    submitQuestion(prompt.message, `Quick prompt used: ${prompt.label}`);
  }

  function handleReviewSummary() {
    const userMessageCount = messages.filter((msg) => msg.role === "user").length;

    if (userMessageCount < 2) {
      setShowSummaryWarning(true);
      return;
    }

    navigate("/customer-summary");
  }

  return (
    <main className="app-page">
      <header className="page-header">
        <div className="view-badge">Customer View</div>
        <p className="page-kicker">Clarity guidance</p>
        <h1>Clarity AI Interview</h1>
        <p className="lead">
          Guided questions that help you understand your coverage, compare
          Prudential product categories, and prepare useful points for your
          Financial Representative.
        </p>
        <div className="clarity-hero-features">
          <span>Explain clearly</span>
          <span>Find missing information</span>
          <span>Prepare advisor notes</span>
        </div>
        <p className="clarity-trust-note">
            It does not replace a Prudential Financial Representative and does not give final financial advice.
        </p>
      </header>

      <section className="journey-stepper-row" aria-label="Customer journey progress">
        <CustomerJourneyStepper activeStep="AI Interview" />
      </section>

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

      <div className="interview-layout">
        <section className="interview-main">
          <section className="card chat-panel">
            <div className="chat-panel-header">
              <div>
                <h2>Guided interview</h2>
                <p className="muted">
                  Ask questions about Prudential insurance coverage, protection
                  needs, wealth planning, policy features, and what to discuss
                  with your Financial Representative.
                </p>
              </div>
              <div className="field compact-field">
                <label htmlFor="explanation-mode">How should Clarity explain things?</label>
                <select
                  id="explanation-mode"
                  className="app-select"
                  value={explanationMode}
                  onChange={(e) => setExplanationMode(e.target.value)}
                >
                  <option value="simple">Simple explanation</option>
                  <option value="detailed">Detailed explanation</option>
                  <option value="comparison">Compare options</option>
                  <option value="advisor_summary">Advisor-ready summary</option>
                </select>
              </div>
            </div>

            {!chatStarted ? (
              <div className="chat-start-panel">
                <div className="clarity-orbit" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div>
                  <h3>Begin your Clarity interview</h3>
                  <p className="muted">
                    Start when you are ready. Clarity will introduce itself,
                    guide the conversation, and save useful points for your
                    Financial Representative.
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={handleStartChatting}
                  disabled={!customerId}
                >
                  Start chatting
                </button>
              </div>
            ) : (
              <>
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
                      {msg.isTyping && <span className="typing-cursor" />}

                      {msg.saved_for_advisor && (
                        <p className="source-note">
                          <strong>Saved for advisor.</strong>
                        </p>
                      )}

                      {msg.source_note && (
                        <p className="source-note">
                          <strong>Source:</strong> {msg.source_note}
                        </p>
                      )}

                      {msg.related_product && (
                        <p className="source-note">
                          <strong>Related category:</strong> {msg.related_product}
                        </p>
                      )}

                      {msg.next_best_questions && msg.next_best_questions.length > 0 && (
                        <section className="clarity-follow-up">
                          <span>Clarity's next question</span>
                          <p>{msg.next_best_questions[0]}</p>
                        </section>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {loading && (
              <div className="chat-message">
                <div className="chat-bubble thinking-bubble" role="status" aria-live="polite">
                  <div className="clarity-orbit clarity-orbit--compact" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div>
                    <strong>Clarity is thinking</strong>
                    <p className="source-note">
                      Reviewing your profile, conversation, and Prudential product context.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="alert" style={{ marginTop: "12px" }}>
                {error}
              </div>
            )}

            {chatStarted && (
              <div className="quick-prompt-groups">
                <div>
                  <h3>Start with one of these</h3>
                  <div className="quick-prompt-primary">
                    {primaryQuickPrompts.map((prompt) => (
                      <button
                        className="btn"
                        type="button"
                        key={prompt.label}
                        onClick={() => handleQuickPrompt(prompt)}
                        disabled={loading || introTyping || !customerId}
                      >
                        {prompt.label}
                      </button>
                    ))}
                  </div>
                  <div className="quick-prompt-secondary">
                    {secondaryQuickPrompts.map((prompt) => (
                      <button
                        className="btn btn-text"
                        type="button"
                        key={prompt.label}
                        onClick={() => handleQuickPrompt(prompt)}
                        disabled={loading || introTyping || !customerId}
                      >
                        {prompt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {chatStarted && (
            <form className="chat-form" onSubmit={handleAskQuestion}>
              <input
                className="app-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  latestNextQuestion ||
                  "Answer Clarity's question or ask about coverage, policy terms, or advisor preparation..."
                }
              />

              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading || introTyping || !customerId}
              >
                {loading ? "Asking..." : "Ask"}
              </button>
            </form>
          )}

          <p className="muted" style={{ marginBottom: "16px" }}>
            Clarity helps explain and prepare questions. Final recommendations
            should be made by a Prudential Financial Representative.
          </p>

          {showSummaryWarning && (
            <div className="alert">
              <strong>More context would improve the advisor brief.</strong>{" "}
              A fuller Clarity interview will help your Prudential Financial
              Representative prepare a more complete and efficient discussion.
              Consider chatting a little more before generating your summary.
              <div className="button-row" style={{ marginTop: "12px" }}>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => navigate("/customer-summary")}
                >
                  Continue anyway
                </button>
              </div>
            </div>
          )}

          <div className="button-row">
            <button
              className="btn btn-primary"
              onClick={handleReviewSummary}
            >
              Review Advisor-Ready Summary
            </button>
          </div>
        </section>

        <aside className="interview-side">
          <section className="card interview-progress-card">
            <h2>Interview Progress</h2>
            {!customer ? (
              <p className="muted">
                Complete your profile so Clarity can track known details and ask
                better questions.
              </p>
            ) : (
              <>
                <section className="progress-block">
                  <h3>Known information</h3>
                  <div className="progress-list">
                    <p>
                      <strong>Main goal</strong>
                      <span>{customer.main_goal || "Not provided"}</span>
                    </p>
                    <p>
                      <strong>Risk comfort</strong>
                      <span>{customer.risk_appetite || "Not provided"}</span>
                    </p>
                    <p>
                      <strong>Existing insurance</strong>
                      <span>{customer.existing_insurance || "Not provided"}</span>
                    </p>
                  </div>
                </section>

                <section className="progress-block">
                  <h3>Next best question</h3>
                  <p>
                    {latestNextQuestion ||
                      "Do you have anyone who depends on your income?"}
                  </p>
                  {unclearItems.length > 0 && (
                    <p className="muted progress-note">
                      Still unclear: {unclearItems.slice(0, 3).join(", ")}
                    </p>
                  )}
                </section>

                <section className="progress-block">
                  <h3>Product focus</h3>
                  <div className="category-map category-map--compact">
                    {categoryStatuses.map((item) => (
                      <div className="category-chip" key={item.name}>
                        <strong>{item.name}</strong>
                        <span>{item.status}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="progress-block">
                  <h3>Saved for advisor</h3>
                  {meaningfulSavedForAdvisor.length === 0 ? (
                    <p className="muted">
                      Useful questions and concerns will appear here as the
                      conversation develops.
                    </p>
                  ) : (
                    <ul className="advisor-save-list">
                      {meaningfulSavedForAdvisor.slice(0, 5).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}

            {missingInfo.length > 0 && (
              <section className="progress-block">
                <h3>Still useful to clarify</h3>
                <div className="tag-list tag-list--compact">
                  {missingInfo.slice(0, 4).map((item, index) => (
                    <span className="tag" key={index}>
                      {item.question}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

export default DocumentChat;
