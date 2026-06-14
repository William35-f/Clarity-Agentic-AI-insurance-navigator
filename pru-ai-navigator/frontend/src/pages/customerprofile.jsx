import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
      full_name: "Amanda Tan",
      age: "28",
      occupation: "Marketing Executive"
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
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

  setTimeout(() => {
    navigate("/document-chat");
  }, 800);
}

      else {
        setMessage("Failed to create profile.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Backend connection error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", fontFamily: "Arial" }}>
      <h1>Customer Profile</h1>
      <p>Set up your profile so the advisor can prepare better.</p>

      <button type="button" onClick={handleMockSingpass}>
        Autofill with Singpass
      </button>

      <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
        <div>
          <label>Full Name</label>
          <input
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Age</label>
          <input
            name="age"
            type="number"
            value={formData.age}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Occupation</label>
          <input
            name="occupation"
            value={formData.occupation}
            onChange={handleChange}
          />
        </div>

        <div>
          <label>Monthly Income</label>
          <input
            name="monthly_income"
            type="number"
            value={formData.monthly_income}
            onChange={handleChange}
          />
        </div>

        <div>
          <label>Risk Appetite</label>
          <select
            name="risk_appetite"
            value={formData.risk_appetite}
            onChange={handleChange}
          >
            <option value="">Select risk appetite</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <div>
          <label>Main Goal</label>
          <select
            name="main_goal"
            value={formData.main_goal}
            onChange={handleChange}
          >
            <option value="">Select goal</option>
            <option value="Grow wealth">Grow wealth</option>
            <option value="Protection">Protection</option>
            <option value="Retirement planning">Retirement planning</option>
            <option value="Education planning">Education planning</option>
          </select>
        </div>

        <div>
          <label>Existing Insurance</label>
          <textarea
            name="existing_insurance"
            value={formData.existing_insurance}
            onChange={handleChange}
            placeholder="Example: I have basic health insurance"
          />
        </div>

        <div>
          <label>Preferred Meeting Type</label>
          <select
            name="preferred_meeting_type"
            value={formData.preferred_meeting_type}
            onChange={handleChange}
          >
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}

export default CustomerProfile;