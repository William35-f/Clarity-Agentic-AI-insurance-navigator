import express from "express";
import pool from "../db.js";

const router = express.Router();
import { extractSchedulePreferencesAI } from "../services/openaiService.js";

function detectProductInterest(customer, questions) {
  const text = `
    ${customer.main_goal || ""}
    ${customer.risk_appetite || ""}
    ${questions.map((q) => q.question).join(" ")}
  `.toLowerCase();

  if (
    text.includes("flexgrowth") ||
    text.includes("single premium") ||
    text.includes("lump sum") ||
    text.includes("lock in") ||
    text.includes("90%") ||
    text.includes("maturity") ||
    text.includes("capital guarantee")
  ) {
    return {
      product_category: "PRU Link FlexGrowth",
      confidence: "High",
      reason:
        "Customer showed interest in single premium investment, maturity protection, locking in gains, or lump-sum wealth growth."
    };
  }

  if (
    text.includes("linkguard") ||
    text.includes("protection") ||
    text.includes("whole life") ||
    text.includes("critical illness") ||
    text.includes("coverage") ||
    text.includes("protect")
  ) {
    return {
      product_category: "PRU Active LinkGuard",
      confidence: "High",
      reason:
        "Customer showed interest in protection, whole life coverage, or investment-linked insurance with coverage features."
    };
  }

  if (
    text.includes("investgrowth") ||
    text.includes("flexibility") ||
    text.includes("build wealth") ||
    text.includes("wealth growth") ||
    text.includes("investment") ||
    text.includes("returns") ||
    text.includes("risk")
  ) {
    return {
      product_category: "PRU Link InvestGrowth",
      confidence: "High",
      reason:
        "Customer showed interest in flexible investment-linked wealth growth, returns, and investment risk."
    };
  }

  return {
    product_category: "General Prudential ILP",
    confidence: "Low",
    reason:
      "Customer has shown general interest in Prudential investment-linked insurance, but no specific product preference is clear yet."
  };
}

// Debug route
router.get("/debug/advisors", async (req, res) => {
  try {
    const [dbInfo] = await pool.execute(`
      SELECT 
        DATABASE() AS current_database,
        @@hostname AS mysql_hostname,
        @@port AS mysql_port,
        USER() AS login_user,
        CURRENT_USER() AS connected_user
    `);

    const [advisorCount] = await pool.execute(`
      SELECT COUNT(*) AS advisor_count FROM advisor
    `);

    const [advisors] = await pool.execute(`
      SELECT advisor_id, full_name, email, specialty, location, workload_score
      FROM advisor
      ORDER BY advisor_id ASC
    `);

    res.json({
      success: true,
      db_info: dbInfo[0],
      advisor_count: advisorCount[0].advisor_count,
      advisors
    });
  } catch (error) {
    console.error("Debug advisors error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Book meeting
router.post("/", async (req, res) => {
  try {
    const { customer_id, meeting_type, meeting_datetime } = req.body || {};

    if (!customer_id || !meeting_type || !meeting_datetime) {
      return res.status(400).json({
        success: false,
        message: "customer_id, meeting_type, and meeting_datetime are required"
      });
    }

    const [customerRows] = await pool.execute(
      `SELECT *
       FROM customer
       WHERE customer_id = ?`,
      [customer_id]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const customer = customerRows[0];

    const [questionRows] = await pool.execute(
      `SELECT question
       FROM questionlog
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [customer_id]
    );

    const interest = detectProductInterest(customer, questionRows);

    await pool.execute(
      `INSERT INTO productinterest
       (customer_id, product_category, reason, confidence)
       VALUES (?, ?, ?, ?)`,
      [
        customer_id,
        interest.product_category,
        interest.reason,
        interest.confidence
      ]
    );

    console.log("Detected interest:", interest);

    const [allAdvisors] = await pool.execute(`
      SELECT advisor_id, full_name, specialty, workload_score
      FROM advisor
      ORDER BY advisor_id ASC
    `);

    console.log("Advisors visible during booking:", allAdvisors);

    // 1. Try exact product specialist
    const [exactAdvisorRows] = await pool.execute(
      `SELECT *
       FROM advisor
       WHERE TRIM(specialty) = TRIM(?)
       ORDER BY workload_score ASC
       LIMIT 1`,
      [interest.product_category]
    );

    let advisor = exactAdvisorRows[0];

    console.log("Exact advisor match:", advisor);

    // 2. Fallback to General Prudential ILP advisor
    if (!advisor) {
      const [generalAdvisorRows] = await pool.execute(
        `SELECT *
         FROM advisor
         WHERE TRIM(specialty) = TRIM(?)
         ORDER BY workload_score ASC
         LIMIT 1`,
        ["General Prudential ILP"]
      );

      advisor = generalAdvisorRows[0];

      console.log("General advisor fallback:", advisor);
    }

    // 3. Final fallback: choose any advisor
    if (!advisor) {
      const [anyAdvisorRows] = await pool.execute(
        `SELECT *
         FROM advisor
         ORDER BY workload_score ASC
         LIMIT 1`
      );

      advisor = anyAdvisorRows[0];

      console.log("Any advisor fallback:", advisor);
    }

    if (!advisor) {
      return res.status(404).json({
        success: false,
        message: "No advisors found in advisor table."
      });
    }

    console.log("Final selected advisor:", advisor);

    const [meetingResult] = await pool.execute(
      `INSERT INTO meeting
       (customer_id, advisor_id, meeting_type, meeting_datetime, product_interest)
       VALUES (?, ?, ?, ?, ?)`,
      [
        customer_id,
        advisor.advisor_id,
        meeting_type,
        meeting_datetime,
        interest.product_category
      ]
    );

    await pool.execute(
      `UPDATE advisor
       SET workload_score = workload_score + 1
       WHERE advisor_id = ?`,
      [advisor.advisor_id]
    );

    res.json({
      success: true,
      message: "Meeting booked successfully",
      meeting_id: meetingResult.insertId,
      product_interest: interest,
      matched_advisor: advisor
    });
  } catch (error) {
    console.error("Meeting booking error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to book meeting",
      error: error.message
    });
  }
});



router.post("/recommend-natural", async (req, res) => {
  try {
    const { customer_id, message } = req.body || {};

    if (!customer_id || !message) {
      return res.status(400).json({
        success: false,
        message: "customer_id and message are required"
      });
    }

    const currentDate = new Date().toISOString().split("T")[0];

    const preferences = await extractSchedulePreferencesAI({
      message,
      currentDate
    });

    if (
      preferences.needs_clarification ||
      !preferences.preferred_date ||
      !preferences.preferred_start_time ||
      !preferences.preferred_end_time ||
      preferences.meeting_type === "Unknown"
    ) {
      return res.json({
        success: true,
        needs_clarification: true,
        preferences,
        clarification_question:
          preferences.clarification_question ||
          "Could you provide your preferred date, time range, and meeting type?"
      });
    }

    const [customerRows] = await pool.execute(
      `SELECT * FROM customer WHERE customer_id = ?`,
      [customer_id]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const customer = customerRows[0];

    const [questionRows] = await pool.execute(
      `SELECT question
       FROM questionlog
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [customer_id]
    );

    const interest = detectProductInterest(customer, questionRows);

    const [slotRows] = await pool.execute(
      `SELECT 
        S.slot_id,
        S.advisor_id,
        S.start_datetime,
        S.end_datetime,
        S.meeting_type,
        A.full_name,
        A.email,
        A.specialty,
        A.location,
        A.workload_score
       FROM advisorslot S
       JOIN advisor A ON S.advisor_id = A.advisor_id
       WHERE S.is_booked = FALSE
       AND S.meeting_type = ?
       AND DATE(S.start_datetime) = ?
       AND TIME(S.start_datetime) >= ?
       AND TIME(S.end_datetime) <= ?
       ORDER BY S.start_datetime ASC`,
      [
        preferences.meeting_type,
        preferences.preferred_date,
        `${preferences.preferred_start_time}:00`,
        `${preferences.preferred_end_time}:00`
      ]
    );

    if (slotRows.length === 0) {
      return res.json({
        success: true,
        needs_clarification: false,
        no_slots_found: true,
        preferences,
        product_interest: interest,
        message:
          "No advisor is available during that exact time range. Please try another date or wider time range."
      });
    }

    const scoredSlots = slotRows.map((slot) => {
      let score = 0;

      if (slot.specialty === interest.product_category) {
        score += 50;
      }

      if (slot.specialty === "General Prudential ILP") {
        score += 20;
      }

      if (slot.meeting_type === preferences.meeting_type) {
        score += 20;
      }

      score += Math.max(0, 20 - Number(slot.workload_score || 0));

      return {
        ...slot,
        score
      };
    });

    scoredSlots.sort((a, b) => b.score - a.score);

    const bestSlot = scoredSlots[0];

    const recommendation = {
      slot_id: bestSlot.slot_id,
      advisor_id: bestSlot.advisor_id,
      advisor_name: bestSlot.full_name,
      advisor_email: bestSlot.email,
      advisor_specialty: bestSlot.specialty,
      advisor_location: bestSlot.location,
      start_datetime: bestSlot.start_datetime,
      end_datetime: bestSlot.end_datetime,
      meeting_type: bestSlot.meeting_type,
      product_interest: interest.product_category,
      confidence: interest.confidence,
      reason: `${bestSlot.full_name} was selected because they are available during the customer's preferred time and their specialty is ${bestSlot.specialty}. The detected product interest is ${interest.product_category}.`
    };

    res.json({
      success: true,
      needs_clarification: false,
      preferences,
      product_interest: interest,
      recommendation,
      alternatives: scoredSlots.slice(1, 4)
    });
  } catch (error) {
    console.error("Natural scheduling recommendation error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to recommend meeting slot",
      error: error.message
    });
  }
});


router.post("/confirm", async (req, res) => {
  try {
    const { customer_id, slot_id, product_interest } = req.body || {};

    if (!customer_id || !slot_id) {
      return res.status(400).json({
        success: false,
        message: "customer_id and slot_id are required"
      });
    }

    const [slotRows] = await pool.execute(
      `SELECT *
       FROM advisorslot
       WHERE slot_id = ?
       AND is_booked = FALSE`,
      [slot_id]
    );

    if (slotRows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "This slot is no longer available."
      });
    }

    const slot = slotRows[0];

    await pool.execute(
      `UPDATE advisorslot
       SET is_booked = TRUE
       WHERE slot_id = ?
       AND is_booked = FALSE`,
      [slot_id]
    );

    const [meetingResult] = await pool.execute(
      `INSERT INTO meeting
       (customer_id, advisor_id, slot_id, meeting_type, meeting_datetime, product_interest)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        slot.advisor_id,
        slot.slot_id,
        slot.meeting_type,
        slot.start_datetime,
        product_interest || "General Prudential ILP"
      ]
    );

    await pool.execute(
      `UPDATE advisor
       SET workload_score = workload_score + 1
       WHERE advisor_id = ?`,
      [slot.advisor_id]
    );

    res.json({
      success: true,
      message: "Meeting confirmed successfully",
      meeting_id: meetingResult.insertId
    });
  } catch (error) {
    console.error("Confirm meeting error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to confirm meeting",
      error: error.message
    });
  }
});
// Get meeting details
router.get("/:meetingId", async (req, res) => {
  try {
    const meetingId = req.params.meetingId;

    const [rows] = await pool.execute(
      `SELECT 
        M.meeting_id,
        M.meeting_type,
        M.meeting_datetime,
        M.product_interest,
        M.status,

        C.customer_id,
        C.full_name AS customer_name,
        C.age,
        C.occupation,
        C.monthly_income,
        C.risk_appetite,
        C.main_goal,
        C.existing_insurance,
        C.preferred_meeting_type,

        A.advisor_id,
        A.full_name AS advisor_name,
        A.email AS advisor_email,
        A.specialty AS advisor_specialty,
        A.location AS advisor_location
       FROM meeting M
       JOIN customer C ON M.customer_id = C.customer_id
       JOIN advisor A ON M.advisor_id = A.advisor_id
       WHERE M.meeting_id = ?`,
      [meetingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found"
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error("Get meeting error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get meeting",
      error: error.message
    });
  }
});

export default router;