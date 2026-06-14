import express from "express";
import pool from "../db.js";
import { generateAdvisorPrepAI } from "../services/openaiService.js";

const router = express.Router();

function safeParseArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function buildWarningsForMeeting(meetingId) {
  const [meetingRows] = await pool.execute(
    `SELECT 
      M.*,
      C.full_name,
      C.age,
      C.occupation,
      C.monthly_income,
      C.risk_appetite,
      C.main_goal,
      C.existing_insurance
     FROM meeting M
     JOIN customer C ON M.customer_id = C.customer_id
     WHERE M.meeting_id = ?`,
    [meetingId]
  );

  if (meetingRows.length === 0) {
    return [];
  }

  const data = meetingRows[0];

  const [tags] = await pool.execute(
    `SELECT tag_name
     FROM customertag
     WHERE customer_id = ?`,
    [data.customer_id]
  );

  const tagNames = tags.map((tag) => tag.tag_name);

  const warnings = [];

  if (!data.monthly_income) {
    warnings.push({
      type: "Affordability",
      severity: "High",
      message:
        "Customer has not provided monthly income. Advisor should confirm affordability before discussing financial commitment."
    });
  }

  if (!data.existing_insurance) {
    warnings.push({
      type: "Coverage Gap",
      severity: "Medium",
      message:
        "Existing insurance coverage is unknown. Advisor should check current protection before discussing investment-linked products."
    });
  }

  if (
    data.risk_appetite === "Low" &&
    String(data.product_interest || "").toLowerCase().includes("pru link")
  ) {
    warnings.push({
      type: "Risk Suitability",
      severity: "High",
      message:
        "Customer has low risk appetite but is discussing an investment-linked product. Advisor should carefully explain market risk."
    });
  }

  if (tagNames.includes("Guaranteed returns")) {
    warnings.push({
      type: "Return Misunderstanding",
      severity: "High",
      message:
        "Customer asked about guaranteed returns. Advisor should clarify that ILP returns are not guaranteed unless specific product terms apply."
    });
  }

  if (tagNames.includes("Premium commitment")) {
    warnings.push({
      type: "Premium Commitment",
      severity: "Medium",
      message:
        "Customer asked about premiums or stopping payment. Advisor should explain policy lapse and commitment implications."
    });
  }

  await pool.execute(
    `DELETE FROM suitabilitywarning
     WHERE meeting_id = ?`,
    [meetingId]
  );

  for (const warning of warnings) {
    await pool.execute(
      `INSERT INTO suitabilitywarning
       (meeting_id, warning_type, severity, message)
       VALUES (?, ?, ?, ?)`,
      [meetingId, warning.type, warning.severity, warning.message]
    );
  }

  return warnings;
}

router.get("/meetings", async (req, res) => {
  try {
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
        C.main_goal,
        C.risk_appetite,

        A.advisor_id,
        A.full_name AS advisor_name,
        A.specialty AS advisor_specialty
       FROM meeting M
       JOIN customer C ON M.customer_id = C.customer_id
       JOIN advisor A ON M.advisor_id = A.advisor_id
       ORDER BY M.meeting_datetime DESC`
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error("Get advisor meetings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get advisor meetings",
      error: error.message
    });
  }
});

router.get("/meetings/:meetingId/warnings", async (req, res) => {
  try {
    const meetingId = req.params.meetingId;

    const warnings = await buildWarningsForMeeting(meetingId);

    res.json({
      success: true,
      data: warnings
    });
  } catch (error) {
    console.error("Suitability warnings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate suitability warnings",
      error: error.message
    });
  }
});

router.post("/meetings/:meetingId/email-preview", async (req, res) => {
  try {
    const meetingId = req.params.meetingId;

    const [rows] = await pool.execute(
      `SELECT 
        M.*,
        C.full_name AS customer_name,
        C.age,
        C.occupation,
        C.main_goal,
        C.risk_appetite,
        A.full_name AS advisor_name,
        A.email AS advisor_email
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

    const meeting = rows[0];

    const [questions] = await pool.execute(
      `SELECT question
       FROM questionlog
       WHERE customer_id = ?
       ORDER BY created_at ASC`,
      [meeting.customer_id]
    );

    const [missingInfo] = await pool.execute(
      `SELECT field_name, question
       FROM missinginfo
       WHERE customer_id = ?`,
      [meeting.customer_id]
    );

    const subject = `New PRUPath AI Meeting — ${meeting.customer_name}`;

    const body = `
Hi ${meeting.advisor_name},

A customer has booked a meeting with you through PRUPath AI.

Customer:
${meeting.customer_name}
Age: ${meeting.age || "Not provided"}
Occupation: ${meeting.occupation || "Not provided"}
Main goal: ${meeting.main_goal || "Not provided"}
Risk appetite: ${meeting.risk_appetite || "Not provided"}

Detected product interest:
${meeting.product_interest || "General Prudential ILP"}

Questions asked:
${
  questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n") ||
  "No questions recorded."
}

Missing information:
${
  missingInfo
    .map((m, i) => `${i + 1}. ${m.field_name} — ${m.question}`)
    .join("\n") || "No major missing information."
}

Please review the advisor dashboard before the meeting.

Regards,
PRUPath AI
`;

    await pool.execute(
      `INSERT INTO advisoremailpreview
       (meeting_id, subject, body)
       VALUES (?, ?, ?)`,
      [meetingId, subject, body]
    );

    res.json({
      success: true,
      data: {
        subject,
        body,
        advisor_email: meeting.advisor_email
      }
    });
  } catch (error) {
    console.error("Email preview error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate email preview",
      error: error.message
    });
  }
});

router.post("/meetings/:meetingId/generate-summary", async (req, res) => {
  try {
    const meetingId = req.params.meetingId;

    const [meetingRows] = await pool.execute(
      `SELECT 
        M.*,
        A.full_name AS advisor_name,
        A.email AS advisor_email,
        A.specialty AS advisor_specialty
       FROM meeting M
       JOIN advisor A ON M.advisor_id = A.advisor_id
       WHERE M.meeting_id = ?`,
      [meetingId]
    );

    if (meetingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found"
      });
    }

    const meeting = meetingRows[0];

    const [customerRows] = await pool.execute(
      `SELECT *
       FROM customer
       WHERE customer_id = ?`,
      [meeting.customer_id]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const customer = customerRows[0];

    const [chatMessages] = await pool.execute(
      `SELECT role, message, created_at
       FROM chatmessage
       WHERE customer_id = ?
       ORDER BY created_at ASC`,
      [meeting.customer_id]
    );

    const [questionLogs] = await pool.execute(
      `SELECT question, related_product, needs_advisor_clarification, created_at
       FROM questionlog
       WHERE customer_id = ?
       ORDER BY created_at ASC`,
      [meeting.customer_id]
    );

    const [missingInfo] = await pool.execute(
      `SELECT field_name, question, is_answered
       FROM missinginfo
       WHERE customer_id = ?
       ORDER BY created_at ASC`,
      [meeting.customer_id]
    );

    const [concernTags] = await pool.execute(
      `SELECT DISTINCT tag_name
       FROM customertag
       WHERE customer_id = ?`,
      [meeting.customer_id]
    );

    const warnings = await buildWarningsForMeeting(meetingId);

    const [readinessRows] = await pool.execute(
      `SELECT score, status, reasons
       FROM readinessscore
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [meeting.customer_id]
    );

    const readinessScore = readinessRows[0] || null;

    const summary = await generateAdvisorPrepAI({
      meeting,
      customer,
      chatMessages,
      questionLogs,
      missingInfo,
      concernTags,
      warnings,
      readinessScore
    });

    await pool.execute(
      `DELETE FROM advisorsummary
       WHERE meeting_id = ?`,
      [meetingId]
    );

    const [summaryResult] = await pool.execute(
      `INSERT INTO advisorsummary
       (meeting_id, customer_summary, product_interest, questions_asked, clarification_points, missing_info, advisor_questions, meeting_agenda, checklist)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        meetingId,
        summary.customer_summary || "",
        summary.product_interest || "",
        JSON.stringify(summary.questions_asked || []),
        JSON.stringify(summary.clarification_points || []),
        JSON.stringify(summary.missing_info || []),
        JSON.stringify(summary.advisor_questions || []),
        JSON.stringify(summary.meeting_agenda || []),
        JSON.stringify(summary.checklist || [])
      ]
    );

    res.json({
      success: true,
      summary_id: summaryResult.insertId,
      data: {
        customer_summary: summary.customer_summary || "",
        product_interest: summary.product_interest || "",
        questions_asked: summary.questions_asked || [],
        clarification_points: summary.clarification_points || [],
        missing_info: summary.missing_info || [],
        advisor_questions: summary.advisor_questions || [],
        meeting_agenda: summary.meeting_agenda || [],
        checklist: summary.checklist || []
      }
    });
  } catch (error) {
    console.error("Generate advisor summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate advisor summary",
      error: error.message
    });
  }
});

router.get("/meetings/:meetingId/summary", async (req, res) => {
  try {
    const meetingId = req.params.meetingId;

    const [rows] = await pool.execute(
      `SELECT *
       FROM advisorsummary
       WHERE meeting_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [meetingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Summary not found"
      });
    }

    const summary = rows[0];

    res.json({
      success: true,
      data: {
        summary_id: summary.summary_id,
        meeting_id: summary.meeting_id,
        customer_summary: summary.customer_summary,
        product_interest: summary.product_interest,
        questions_asked: safeParseArray(summary.questions_asked),
        clarification_points: safeParseArray(summary.clarification_points),
        missing_info: safeParseArray(summary.missing_info),
        advisor_questions: safeParseArray(summary.advisor_questions),
        meeting_agenda: safeParseArray(summary.meeting_agenda),
        checklist: safeParseArray(summary.checklist),
        created_at: summary.created_at
      }
    });
  } catch (error) {
    console.error("Get advisor summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get advisor summary",
      error: error.message
    });
  }
});

export default router;