import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerJourneyStepper from "../components/CustomerJourneyStepper";

const occupationOptions = [
  "Student",
  "Full-time Employee",
  "Part-time Employee",
  "Self-employed",
  "Freelancer",
  "Business Owner",
  "Homemaker",
  "Retired",
  "Unemployed",
  "NSF / National Service",
  "Healthcare Worker",
  "Teacher / Educator",
  "Engineer",
  "IT / Tech Professional",
  "Finance / Banking",
  "Marketing Executive",
  "Sales / Marketing",
  "Driver / Delivery Rider",
  "Service Staff",
  "Others"
];

const singpassSampleProfile = {
  full_name: "Amanda Tan",
  age: "28",
  occupation: "Marketing Executive",
  monthly_income: "6200",
  risk_appetite: "medium",
  main_goal: "Grow wealth",
  existing_insurance:
    "Integrated Shield Plan and employer-provided group insurance.",
  preferred_meeting_type: "Online"
};

function CustomerProfile() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    occupation: "",
    monthly_income: "",
    risk_appetite: "",
    main_goal: "",
    existing_insurance: "",
    preferred_meeting_type: "Online"
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });
  }

  function handleMockSingpass() {
    setFormData({
      ...formData,
      ...singpassSampleProfile
    });
    setMessageType("success");
    setMessage("Sample Singpass profile filled. Review the details before saving.");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const age = Number(formData.age);
    const monthlyIncome = Number(formData.monthly_income);

    if (!formData.full_name.trim()) {
      setMessageType("error");
      setMessage("Please enter your full name.");
      return;
    }

    if (!formData.age || !Number.isFinite(age)) {
      setMessageType("error");
      setMessage("Please enter a valid age.");
      return;
    }

    if (!Number.isInteger(age)) {
      setMessageType("error");
      setMessage("Please enter your age as a whole number.");
      return;
    }

    if (age < 18) {
      setMessageType("error");
      setMessage(
        "You need a parent or legal guardian to submit this profile on your behalf."
      );
      return;
    }

    if (age > 100) {
      setMessageType("error");
      setMessage("Please enter an age of 100 or below.");
      return;
    }

    if (!formData.occupation.trim()) {
      setMessageType("error");
      setMessage("Please enter your occupation.");
      return;
    }

    if (!formData.monthly_income || !Number.isFinite(monthlyIncome)) {
      setMessageType("error");
      setMessage("Please enter a valid monthly income.");
      return;
    }

    if (monthlyIncome < 0) {
      setMessageType("error");
      setMessage("Monthly income cannot be negative.");
      return;
    }

    setMessage("");
    setMessageType("success");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          occupation: formData.occupation.trim(),
          age,
          monthly_income: monthlyIncome
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("customer_id", data.customer_id);

        const missingResponse = await fetch(
          `http://localhost:5000/api/customers/${data.customer_id}/analyze-missing-info`,
          {
            method: "POST"
          }
        );

        const missingData = await missingResponse.json();

        if (missingData.success) {
          localStorage.setItem(
            "missing_info",
            JSON.stringify(missingData.missing_info)
          );
        }

        setMessage("Profile created successfully!");
        setMessageType("success");

        setTimeout(() => {
          navigate("/document-chat");
        }, 800);
      } else {
        setMessageType("error");
        setMessage(data.message || "Failed to create profile.");
      }
    } catch (error) {
      console.error(error);
      setMessageType("error");
      setMessage("Backend connection error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-page">
      <header className="page-header">
        <div className="view-badge">Customer View</div>
        <p className="page-kicker">Clarity customer journey</p>
        <h1>Tell Clarity about yourself</h1>
        <p className="lead">
          These details help Clarity ask better questions and prepare your
          Prudential Financial Representative for a more relevant conversation.
        </p>
        <CustomerJourneyStepper activeStep="Profile" />
      </header>

      <div className="profile-layout">
        <section className="card profile-card">
          <div className="profile-card-header">
            <div>
              <h2>Profile details</h2>
              <p className="muted">
                Clarity uses this to understand your situation and choose the
                next best questions.
              </p>
            </div>
            <div className="singpass-action">
              <button className="btn btn-outline" type="button" onClick={handleMockSingpass}>
                Auto-fill with Singpass
              </button>
              <p className="field-help">Faster setup using verified personal details.</p>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleSubmit} noValidate>
          <div className="form-section">
            <h3>Personal information</h3>
            <div className="profile-form-grid">
              <div className="field">
                <label htmlFor="full_name">Full Name</label>
                <input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="age">Age</label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="5"
                  placeholder="Enter your age"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Work and finances</h3>
            <div className="profile-form-grid">
              <div className="field">
                <label htmlFor="occupation">What is your current occupation?</label>
                <input
                  id="occupation"
                  name="occupation"
                  list="occupation-options"
                  value={formData.occupation}
                  onChange={handleChange}
                  placeholder="Choose or type your occupation"
                  required
                />
                <datalist id="occupation-options">
                  {occupationOptions.map((occupation) => (
                    <option key={occupation} value={occupation} />
                  ))}
                </datalist>
                <p className="field-help">
                  Helps Clarity understand your life stage and protection needs.
                </p>
              </div>

              <div className="field">
                <label htmlFor="monthly_income">Monthly Income (SGD)</label>
                <input
                  type="number"
                  id="monthly_income"
                  name="monthly_income"
                  value={formData.monthly_income}
                  onChange={handleChange}
                  min="0"
                  step="1000"
                  placeholder="e.g. 3000"
                  required
                />
                <p className="field-help">
                  Used only to understand affordability and prepare a suitable discussion.
                </p>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Planning preferences</h3>
            <div className="profile-form-grid">
              <div className="field">
                <label htmlFor="risk_appetite">
                  How comfortable are you with investment risk?
                </label>
                <select
                  id="risk_appetite"
                  name="risk_appetite"
                  value={formData.risk_appetite}
                  onChange={handleChange}
                >
                  <option value="">Choose your comfort level</option>
                  <option value="low">Low - I prefer safer options</option>
                  <option value="medium">Medium - I'm okay with some risk</option>
                  <option value="high">High - I'm comfortable with higher risk</option>
                  <option value="not_sure">Not sure - I'd like help understanding this</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="main_goal">Main Goal</label>
                <select
                  id="main_goal"
                  name="main_goal"
                  value={formData.main_goal}
                  onChange={handleChange}
                >
                  <option value="">Select goal</option>
                  <option value="Grow wealth">Grow wealth</option>
                  <option value="Protection">Protection</option>
                  <option value="Retirement planning">Retirement planning</option>
                  <option value="Education planning">Education planning</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="field field--full">
                <label htmlFor="existing_insurance">Do you currently have any insurance?</label>
                <textarea
                  id="existing_insurance"
                  name="existing_insurance"
                  value={formData.existing_insurance}
                  onChange={handleChange}
                  placeholder="Example: Hospital plan, life insurance, critical illness plan, or 'Not sure'"
                />
                <p className="field-help">
                  If you are unsure, you can type 'Not sure' and Clarity will ask follow-up questions later.
                </p>
              </div>

              <div className="field">
                <label htmlFor="preferred_meeting_type">Preferred Meeting Type</label>
                <select
                  id="preferred_meeting_type"
                  name="preferred_meeting_type"
                  value={formData.preferred_meeting_type}
                  onChange={handleChange}
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <p className="muted">You can still update missing details during the Clarity chat.</p>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : Number(formData.age) < 18 && formData.age
                  ? "Continue with Parent / Guardian"
                  : "Save and Start Clarity Chat"}
            </button>
          </div>
          </form>
        </section>

        <aside className="card clarity-side-panel">
          <h2>How Clarity uses this</h2>
          <ul>
            <li>Understand your life stage</li>
            <li>Identify missing information</li>
            <li>Choose the next best questions</li>
            <li>Prepare your advisor brief</li>
          </ul>
          <div className="next-step-box">
            <h3>Next step</h3>
            <p>
              After saving your profile, Clarity will begin an AI interview to
              clarify your needs before generating a Financial Representative brief.
            </p>
          </div>
        </aside>
      </div>

      {message && (
        <div className={`alert ${messageType === "success" ? "alert-success" : ""}`}>
          {message}
        </div>
      )}
    </main>
  );
}

export default CustomerProfile;
