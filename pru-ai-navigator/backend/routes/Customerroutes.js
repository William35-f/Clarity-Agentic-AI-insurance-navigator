import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      full_name,
      age,
      occupation,
      monthly_income,
      risk_appetite,
      main_goal,
      existing_insurance,
      preferred_meeting_type
    } = req.body || {};

    const cleanAge =
      age === "" || age === undefined || age === null ? null : Number(age);

    const cleanMonthlyIncome =
      monthly_income === "" ||
      monthly_income === undefined ||
      monthly_income === null
        ? null
        : Number(monthly_income);

    const [result] = await pool.execute(
      `INSERT INTO customer 
      (full_name, age, occupation, monthly_income, risk_appetite, main_goal, existing_insurance, preferred_meeting_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name || null,
        cleanAge,
        occupation || null,
        cleanMonthlyIncome,
        risk_appetite || null,
        main_goal || null,
        existing_insurance || null,
        preferred_meeting_type || null
      ]
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
        missing_info: missingInfo,
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

    const allowedFields = new Set([
      "monthly_income",
      "risk_appetite",
      "main_goal",
      "existing_insurance",
      "preferred_meeting_type"
    ]);

    const updates = Object.entries(answers).filter(
      ([fieldName, value]) =>
        allowedFields.has(fieldName) &&
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    );

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

    for (const [fieldName, value] of updates) {
      const cleanValue =
        fieldName === "monthly_income" ? Number(value) : String(value).trim();

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
    }

    res.json({
      success: true,
      message: "Missing information saved",
      updated_fields: updates.map(([fieldName]) => fieldName)
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
        question: "What is your estimated monthly income?"
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
      data: rows
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
