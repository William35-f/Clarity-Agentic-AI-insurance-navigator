import express from "express";
import pool from "../db.js";

const router = express.Router();

const ALLOWED_RISK_APPETITES = new Set(["low", "medium", "high", "not_sure"]);
const ALLOWED_MAIN_GOALS = new Set([
  "Grow wealth",
  "Protection",
  "Retirement planning",
  "Education planning",
  "Others"
]);
const ALLOWED_MEETING_TYPES = new Set(["Online", "Offline"]);

const MISSING_INFO_FIELDS = {
  monthly_income: {
    aliases: ["monthly income", "monthly salary", "salary", "monthly pay"],
    label: "Monthly income"
  },
  risk_appetite: {
    aliases: ["risk appetite", "risk tolerance", "investment risk comfort"],
    label: "Risk appetite"
  },
  main_goal: {
    aliases: ["main goal", "financial goal", "goal", "objective"],
    label: "Main financial goal"
  },
  existing_insurance: {
    aliases: [
      "existing insurance",
      "insurance coverage",
      "current insurance",
      "coverage"
    ],
    label: "Existing insurance"
  },
  preferred_meeting_type: {
    aliases: ["preferred meeting type", "meeting type", "meeting preference"],
    label: "Preferred meeting type"
  }
};

function normalizeMissingInfoQuestion(question = "") {
  const questionText = String(question).trim();
  const lowerQuestion = questionText.toLowerCase();

  if (
    lowerQuestion.includes("preferred monthly or annual premium budget") ||
    (lowerQuestion.includes("monthly or annual") &&
      lowerQuestion.includes("premium budget"))
  ) {
    return "What is your preferred monthly premium budget for this investment-linked plan?";
  }

  return questionText || "Advisor should clarify this information.";
}

function normalizeMissingInfoField(fieldName = "", question = "") {
  const questionText = String(question).trim().toLowerCase();

  if (
    questionText.includes("premium budget") ||
    questionText.includes("monthly income payouts") ||
    (questionText.includes("long-term growth") &&
      questionText.includes("balance of both"))
  ) {
    return questionText.includes("premium budget") ? "monthly_income" : "main_goal";
  }

  const normalized = String(fieldName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  if (MISSING_INFO_FIELDS[normalized]) {
    return normalized;
  }

  const readable = normalized.replace(/_/g, " ");

  return (
    Object.entries(MISSING_INFO_FIELDS).find(([, config]) =>
      config.aliases.some((alias) => readable.includes(alias))
    )?.[0] || null
  );
}

router.post("/", async (req, res) => {
  try {
    const {
      full_name,
      email,
      age,
      occupation,
      monthly_income,
      risk_appetite,
      main_goal,
      existing_insurance,
      preferred_meeting_type
    } = req.body || {};

    const cleanFullName = String(full_name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanOccupation = String(occupation || "").trim();
    const cleanRiskAppetite = String(risk_appetite || "").trim().toLowerCase();
    const cleanMainGoal = String(main_goal || "").trim();
    const cleanExistingInsurance = String(existing_insurance || "").trim();
    const cleanPreferredMeetingType = String(
      preferred_meeting_type || "Online"
    ).trim();

    if (!cleanFullName) {
      return res.status(400).json({
        success: false,
        message: "Full name is required"
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: "A valid email is required for follow-ups" });
    }

    const cleanAge =
      age === "" || age === undefined || age === null ? null : Number(age);

    if (
      cleanAge === null ||
      !Number.isFinite(cleanAge) ||
      !Number.isInteger(cleanAge) ||
      cleanAge < 0 ||
      cleanAge > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Age must be a realistic whole number"
      });
    }

    if (cleanAge < 18) {
      return res.status(400).json({
        success: false,
        message:
          "You need a parent or legal guardian to submit this profile on your behalf."
      });
    }

    if (!cleanOccupation) {
      return res.status(400).json({
        success: false,
        message: "Occupation is required"
      });
    }

    const cleanMonthlyIncome =
      monthly_income === "" ||
      monthly_income === undefined ||
      monthly_income === null
        ? null
        : Number(monthly_income);

    if (
      cleanMonthlyIncome === null ||
      !Number.isFinite(cleanMonthlyIncome) ||
      cleanMonthlyIncome < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Monthly income must be a non-negative number"
      });
    }

    if (
      cleanRiskAppetite &&
      !ALLOWED_RISK_APPETITES.has(cleanRiskAppetite)
    ) {
      return res.status(400).json({
        success: false,
        message: "Risk appetite must be low, medium, high, or not_sure"
      });
    }

    if (cleanMainGoal && !ALLOWED_MAIN_GOALS.has(cleanMainGoal)) {
      return res.status(400).json({
        success: false,
        message: "Main goal is not valid"
      });
    }

    if (!ALLOWED_MEETING_TYPES.has(cleanPreferredMeetingType)) {
      return res.status(400).json({
        success: false,
        message: "Preferred meeting type must be Online or Offline"
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO customer 
      (full_name, age, occupation, monthly_income, risk_appetite, main_goal, existing_insurance, preferred_meeting_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanFullName,
        cleanAge,
        cleanOccupation,
        cleanMonthlyIncome,
        cleanRiskAppetite || null,
        cleanMainGoal || null,
        cleanExistingInsurance || null,
        cleanPreferredMeetingType
      ]
    );

    await pool.execute(
      `INSERT INTO customercontact (customer_id, email) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE email = VALUES(email)`,
      [result.insertId, cleanEmail]
    );

    res.json({
      success: true,
      customer_id: result.insertId,
      message: "Customer profile created"
    });
  } catch (error) {
    console.error("Customer create error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message
    });
  }
});

router.get("/:id/session-summary", async (req, res) => {
  try {
    const customerId = req.params.id;

    const [customerRows] = await pool.execute(
      `SELECT *
       FROM customer
       WHERE customer_id = ?`,
      [customerId]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const [questions] = await pool.execute(
      `SELECT question, related_product, created_at
       FROM questionlog
       WHERE customer_id = ?
       ORDER BY created_at ASC`,
      [customerId]
    );

    const [missingInfo] = await pool.execute(
      `SELECT field_name, question
       FROM missinginfo
       WHERE customer_id = ?
       AND is_answered = FALSE
       ORDER BY created_at ASC`,
      [customerId]
    );

    const [tags] = await pool.execute(
      `SELECT DISTINCT tag_name
       FROM customertag
       WHERE customer_id = ?`,
      [customerId]
    );

    const [interestRows] = await pool.execute(
      `SELECT product_category, reason, confidence
       FROM productinterest
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [customerId]
    );

    res.json({
      success: true,
      data: {
        customer: customerRows[0],
        questions,
        missing_info: missingInfo.map((item) => ({
          ...item,
          question: normalizeMissingInfoQuestion(item.question)
        })),
        concern_tags: tags.map((tag) => tag.tag_name),
        latest_product_interest: interestRows[0] || null
      }
    });
  } catch (error) {
    console.error("Session summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get session summary",
      error: error.message
    });
  }
});

router.post("/:id/readiness-score", async (req, res) => {
  try {
    const customerId = req.params.id;

    const [customerRows] = await pool.execute(
      `SELECT *
       FROM customer
       WHERE customer_id = ?`,
      [customerId]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const customer = customerRows[0];

    const [questionRows] = await pool.execute(
      `SELECT *
       FROM questionlog
       WHERE customer_id = ?`,
      [customerId]
    );

    const [tagRows] = await pool.execute(
      `SELECT *
       FROM customertag
       WHERE customer_id = ?`,
      [customerId]
    );

    let score = 0;
    const reasons = [];

    if (customer.monthly_income) {
      score += 20;
    } else {
      reasons.push("Monthly income is missing.");
    }

    if (customer.risk_appetite) {
      score += 20;
    } else {
      reasons.push("Risk appetite is missing.");
    }

    if (customer.main_goal) {
      score += 20;
    } else {
      reasons.push("Main financial goal is missing.");
    }

    if (customer.existing_insurance) {
      score += 20;
    } else {
      reasons.push("Existing insurance coverage is not provided.");
    }

    if (questionRows.length > 0) {
      score += 20;
    } else {
      reasons.push("Customer has not asked any clarification questions yet.");
    }

    const hasGuaranteedReturnConcern = tagRows.some(
      (tag) => tag.tag_name === "Guaranteed returns"
    );

    const hasRiskConcern = tagRows.some(
      (tag) => tag.tag_name === "Investment risk"
    );

    if (hasGuaranteedReturnConcern) {
      score -= 10;
      reasons.push(
        "Customer may need clarification about non-guaranteed returns."
      );
    }

    if (hasRiskConcern) {
      score -= 10;
      reasons.push("Customer has concerns about investment risk.");
    }

    score = Math.max(0, Math.min(100, score));

    let status = "Ready for consultation";

    if (score < 50) {
      status = "Needs more information before consultation";
    } else if (score < 75) {
      status = "Partially ready, advisor should clarify key points";
    }

    await pool.execute(
      `INSERT INTO readinessscore
       (customer_id, score, status, reasons)
       VALUES (?, ?, ?, ?)`,
      [customerId, score, status, JSON.stringify(reasons)]
    );

    res.json({
      success: true,
      data: {
        customer_id: Number(customerId),
        score,
        status,
        reasons
      }
    });
  } catch (error) {
    console.error("Readiness score error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to calculate readiness score",
      error: error.message
    });
  }
});

router.patch("/:id/missing-info", async (req, res) => {
  try {
    const customerId = req.params.id;
    const answers = req.body?.answers || {};

    const updatesByField = new Map();

    for (const [fieldName, value] of Object.entries(answers)) {
      const normalizedField = normalizeMissingInfoField(fieldName);

      if (
        normalizedField &&
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        updatesByField.set(normalizedField, value);
      }
    }

    const updates = [...updatesByField.entries()];

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one missing information answer is required"
      });
    }

    const [customerRows] = await pool.execute(
      `SELECT customer_id
       FROM customer
       WHERE customer_id = ?`,
      [customerId]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const cleanedUpdates = [];

    for (const [fieldName, value] of updates) {
      const cleanValue =
        fieldName === "monthly_income" ? Number(value) : String(value).trim();

      if (
        fieldName === "monthly_income" &&
        (!Number.isFinite(cleanValue) || cleanValue < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: "Monthly income must be a valid number"
        });
      }

      cleanedUpdates.push([fieldName, cleanValue]);
    }

    const savedInfo = [];

    for (const [fieldName, cleanValue] of cleanedUpdates) {
      await pool.execute(
        `UPDATE customer
         SET ${fieldName} = ?
         WHERE customer_id = ?`,
        [cleanValue, customerId]
      );

      await pool.execute(
        `UPDATE missinginfo
         SET is_answered = TRUE
         WHERE customer_id = ?
         AND field_name = ?`,
        [customerId, fieldName]
      );

      const [openMissingRows] = await pool.execute(
        `SELECT missing_id, field_name, question
         FROM missinginfo
         WHERE customer_id = ?
         AND is_answered = FALSE`,
        [customerId]
      );

      for (const row of openMissingRows) {
        if (normalizeMissingInfoField(row.field_name, row.question) === fieldName) {
          await pool.execute(
            `UPDATE missinginfo
             SET is_answered = TRUE
             WHERE missing_id = ?`,
            [row.missing_id]
          );
        }
      }

      savedInfo.push({
        field_name: fieldName,
        label: MISSING_INFO_FIELDS[fieldName].label,
        value: cleanValue
      });
    }

    const [updatedCustomerRows] = await pool.execute(
      `SELECT *
       FROM customer
       WHERE customer_id = ?`,
      [customerId]
    );

    res.json({
      success: true,
      message: "Missing information saved",
      updated_fields: updates.map(([fieldName]) => fieldName),
      saved_info: savedInfo,
      customer: updatedCustomerRows[0]
    });
  } catch (error) {
    console.error("Update missing info error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save missing information",
      error: error.message
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const customerId = req.params.id;

    const [rows] = await pool.execute(
      `SELECT *
       FROM customer
       WHERE customer_id = ?`,
      [customerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error("Customer get error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get customer",
      error: error.message
    });
  }
});

router.post("/:id/analyze-missing-info", async (req, res) => {
  try {
    const customerId = req.params.id;

    const [rows] = await pool.execute(
      `SELECT *
       FROM customer
       WHERE customer_id = ?`,
      [customerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const customer = rows[0];

    const missingInfo = [];

    if (
      customer.monthly_income === null ||
      customer.monthly_income === undefined ||
      customer.monthly_income === ""
    ) {
      missingInfo.push({
        field_name: "monthly_income",
        question: "What is your monthly income?"
      });
    }

    if (!customer.risk_appetite || customer.risk_appetite.trim() === "") {
      missingInfo.push({
        field_name: "risk_appetite",
        question:
          "Are you more comfortable with low, medium, or high investment risk?"
      });
    }

    if (!customer.main_goal || customer.main_goal.trim() === "") {
      missingInfo.push({
        field_name: "main_goal",
        question: "What is your main financial goal right now?"
      });
    }

    if (
      !customer.existing_insurance ||
      customer.existing_insurance.trim() === ""
    ) {
      missingInfo.push({
        field_name: "existing_insurance",
        question: "Do you currently have any insurance coverage?"
      });
    }

    if (
      !customer.preferred_meeting_type ||
      customer.preferred_meeting_type.trim() === ""
    ) {
      missingInfo.push({
        field_name: "preferred_meeting_type",
        question:
          "Would you prefer an online or offline meeting with a Prudential Financial Representative?"
      });
    }

    await pool.execute(
      `DELETE FROM missinginfo
       WHERE customer_id = ?`,
      [customerId]
    );

    for (const item of missingInfo) {
      await pool.execute(
        `INSERT INTO missinginfo
         (customer_id, field_name, question)
         VALUES (?, ?, ?)`,
        [customerId, item.field_name, item.question]
      );
    }

    res.json({
      success: true,
      customer_id: Number(customerId),
      missing_count: missingInfo.length,
      missing_info: missingInfo
    });
  } catch (error) {
    console.error("Missing info analysis error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to analyze missing information",
      error: error.message
    });
  }
});

router.get("/:id/missing-info", async (req, res) => {
  try {
    const customerId = req.params.id;

    const [rows] = await pool.execute(
      `SELECT *
       FROM missinginfo
       WHERE customer_id = ?
       AND is_answered = FALSE
       ORDER BY created_at ASC`,
      [customerId]
    );

    res.json({
      success: true,
      data: rows.map((item) => ({
        ...item,
        question: normalizeMissingInfoQuestion(item.question)
      }))
    });
  } catch (error) {
    console.error("Get missing info error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get missing information",
      error: error.message
    });
  }
});

export default router;
