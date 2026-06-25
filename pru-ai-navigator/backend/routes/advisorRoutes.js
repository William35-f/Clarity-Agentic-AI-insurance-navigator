import express from "express";
import pool from "../db.js";
import {
  generateAdvisorMeetingAssistantAI,
  generateAdvisorPrepAI
} from "../services/openaiService.js";

const router = express.Router();

// Demo-only role separation for the hackathon prototype.
// This is not production authentication.
function requireAdvisorDemoRole(req, res, next) {
  if (req.get("x-demo-role") !== "advisor") {
    return res.status(403).json({
      success: false,
      message: "Advisor access required for this feature."
    });
  }

  next();
}

function safeParseArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function uniqueNonEmpty(values) {
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  ];
}

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];

  return uniqueNonEmpty(
    value.map((item) => {
      if (typeof item === "string") return item;
      if (item?.question) return item.question;
      if (item?.message) return item.message;
      if (item?.field_name) return item.field_name;
      return "";
    })
  );
}

async function buildAdvisorChatContext({ customerId, meetingId }) {
  let meeting = null;
  let resolvedCustomerId = customerId || null;

  if (meetingId) {
    const [meetingRows] = await pool.execute(
      `SELECT 
        M.*,
        A.full_name AS advisor_name,
        A.email AS advisor_email,
        A.specialty AS advisor_specialty,
        C.full_name AS customer_name
       FROM meeting M
       LEFT JOIN advisor A ON M.advisor_id = A.advisor_id
       LEFT JOIN customer C ON M.customer_id = C.customer_id
       WHERE M.meeting_id = ?`,
      [meetingId]
    );

    meeting = meetingRows[0] || null;

    if (meeting?.customer_id) {
      resolvedCustomerId = meeting.customer_id;
    }
  }

  let customer = null;
  let chatMessages = [];
  let questionLogs = [];
  let missingInfo = [];
  let latestProductInterest = null;
  let advisorSummary = null;

  if (resolvedCustomerId) {
    const [customerRows] = await pool.execute(
      `SELECT *
       FROM customer
       WHERE customer_id = ?`,
      [resolvedCustomerId]
    );

    customer = customerRows[0] || null;

    const [chatRows] = await pool.execute(
      `SELECT role, message, created_at
       FROM chatmessage
       WHERE customer_id = ?
       ORDER BY created_at ASC`,
      [resolvedCustomerId]
    );

    chatMessages = chatRows;

    const [questionRows] = await pool.execute(
      `SELECT question, related_product, needs_advisor_clarification, created_at
       FROM questionlog
       WHERE customer_id = ?
       ORDER BY created_at ASC`,
      [resolvedCustomerId]
    );

    questionLogs = questionRows;

    const [missingRows] = await pool.execute(
      `SELECT field_name, question, is_answered
       FROM missinginfo
       WHERE customer_id = ?
       ORDER BY created_at ASC`,
      [resolvedCustomerId]
    );

    missingInfo = missingRows;

    const [productRows] = await pool.execute(
      `SELECT product_category, reason, confidence
       FROM productinterest
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [resolvedCustomerId]
    );

    latestProductInterest = productRows[0] || null;
  }

  if (meetingId) {
    const [summaryRows] = await pool.execute(
      `SELECT *
       FROM advisorsummary
       WHERE meeting_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [meetingId]
    );

    const summary = summaryRows[0] || null;

    if (summary) {
      advisorSummary = {
        summary_id: summary.summary_id,
        meeting_id: summary.meeting_id,
        customer_summary: summary.customer_summary,
        product_interest: summary.product_interest,
        questions_asked: safeParseArray(summary.questions_asked),
        clarification_points: safeParseArray(summary.clarification_points),
        missing_info: safeParseArray(summary.missing_info),
        advisor_questions: safeParseArray(summary.advisor_questions),
        meeting_agenda: safeParseArray(summary.meeting_agenda),
        checklist: safeParseArray(summary.checklist)
      };
    }
  }

  return {
    meeting,
    customer,
    chat_messages: chatMessages,
    question_logs: questionLogs,
    missing_info: missingInfo,
    latest_product_interest: latestProductInterest,
    advisor_summary: advisorSummary
  };
}

router.use(requireAdvisorDemoRole);

function buildAdvisorPrepFallback({
  meeting,
  customer,
  chatMessages,
  questionLogs,
  missingInfo,
  concernTags,
  warnings,
  readinessScore
}) {
  const conversationQuestions = uniqueNonEmpty(
    chatMessages
      .filter((message) => message.role === "user")
      .map((message) => message.message)
  );

  const loggedQuestions = uniqueNonEmpty(questionLogs.map((q) => q.question));
  const questionsAsked =
    conversationQuestions.length > 0 ? conversationQuestions : loggedQuestions;

  const missingInfoItems = uniqueNonEmpty(
    missingInfo
      .filter((item) => !item.is_answered)
      .map((item) => item.question || item.field_name)
  );

  const clarificationPoints = uniqueNonEmpty([
    ...questionLogs
      .filter((q) => q.needs_advisor_clarification)
      .map((q) => `Clarify: ${q.question}`),
    ...warnings.map((warning) => warning.message),
    ...concernTags.map((tag) => `Address customer concern: ${tag.tag_name}`)
  ]);

  const providedProfile = [
    customer.monthly_income ? `monthly income ${customer.monthly_income}` : "",
    customer.main_goal ? `main goal ${customer.main_goal}` : "",
    customer.risk_appetite ? `risk appetite ${customer.risk_appetite}` : "",
    customer.existing_insurance
      ? `existing insurance ${customer.existing_insurance}`
      : ""
  ]
    .filter(Boolean)
    .join(", ");

  return {
    customer_summary:
      `${customer.full_name || "The customer"} is preparing for a ${meeting.meeting_type || "meeting"} consultation. ` +
      `Known profile details: ${providedProfile || "limited profile details provided"}. ` +
      `Readiness: ${readinessScore?.status || "not calculated"}.`,
    product_interest: meeting.product_interest || "General Prudential ILP",
    questions_asked: questionsAsked,
    clarification_points:
      clarificationPoints.length > 0
        ? clarificationPoints
        : [
            "Confirm product suitability, risks, charges, affordability, and policy terms."
          ],
    missing_info:
      missingInfoItems.length > 0
        ? missingInfoItems
        : ["Confirm that the customer profile details are still accurate."],
    advisor_questions: [
      "What is your main financial goal for this plan?",
      "What monthly premium amount would be comfortable for you?",
      "How comfortable are you with investment values going up and down?",
      "Do you already have insurance coverage, and what gaps are you trying to address?",
      "What would you like to understand before deciding next steps?"
    ],
    meeting_agenda: [
      "5 min - Confirm customer profile and goals.",
      "5 min - Review questions asked in the Clarity conversation.",
      "10 min - Explain relevant product features, risks, charges, and premium commitment.",
      "5 min - Clarify missing information and customer concerns.",
      "5 min - Confirm understanding and next steps."
    ],
    checklist: [
      "Review the customer's Clarity conversation questions.",
      "Confirm financial goals and risk appetite.",
      "Check monthly premium affordability.",
      "Explain investment risk and non-guaranteed returns.",
      "Explain charges, withdrawals, surrender implications, and policy terms.",
      "Confirm current insurance coverage and protection gaps.",
      "Document next steps agreed with the customer."
    ]
  };
}

router.get("/chat/context", async (req, res) => {
  try {
    const context = await buildAdvisorChatContext({
      customerId: req.query.customer_id,
      meetingId: req.query.meeting_id
    });

    res.json({
      success: true,
      data: context,
      message:
        context.customer || context.meeting
          ? "Advisor meeting context loaded"
          : "No customer context found. The assistant can still answer general advisor-support questions."
    });
  } catch (error) {
    console.error("Advisor chat context error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load advisor meeting context",
      error: error.message
    });
  }
});

router.post("/chat", async (req, res) => {
  try {
    const {
      customer_id,
      meeting_id,
      message,
      current_meeting_notes,
      customer_context
    } = req.body || {};

    const cleanMessage = String(message || "").trim();

    if (!cleanMessage) {
      return res.status(400).json({
        success: false,
        message: "Advisor message is required"
      });
    }

    const context =
      customer_context?.customer || customer_context?.meeting
        ? customer_context
        : await buildAdvisorChatContext({
            customerId: customer_id,
            meetingId: meeting_id
          });

    const aiResult = await generateAdvisorMeetingAssistantAI({
      customer: context.customer,
      meeting: context.meeting,
      advisorSummary: context.advisor_summary,
      chatMessages: context.chat_messages || [],
      questionLogs: context.question_logs || [],
      missingInfo: context.missing_info || [],
      currentMeetingNotes: current_meeting_notes,
      message: cleanMessage
    });

    res.json({
      success: true,
      reply: aiResult.reply,
      suggested_questions: aiResult.suggested_questions || [],
      missing_information: aiResult.missing_information || [],
      meeting_notes_update: aiResult.meeting_notes_update || "",
      context_status:
        context.customer || context.meeting
          ? "customer_context_loaded"
          : "no_customer_context"
    });
  } catch (error) {
    console.error("Advisor chat error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate advisor assistant response",
      error: error.message
    });
  }
});

function mergeAdvisorPrepSummary(aiSummary, fallback) {
  return {
    customer_summary:
      String(aiSummary?.customer_summary || "").trim() ||
      fallback.customer_summary,
    product_interest:
      String(aiSummary?.product_interest || "").trim() ||
      fallback.product_interest,
    questions_asked:
      fallback.questions_asked.length > 0
        ? fallback.questions_asked
        : normalizeArray(aiSummary?.questions_asked),
    clarification_points:
      normalizeArray(aiSummary?.clarification_points).length > 0
        ? normalizeArray(aiSummary.clarification_points)
        : fallback.clarification_points,
    missing_info:
      normalizeArray(aiSummary?.missing_info).length > 0
        ? normalizeArray(aiSummary.missing_info)
        : fallback.missing_info,
    advisor_questions:
      normalizeArray(aiSummary?.advisor_questions).length > 0
        ? normalizeArray(aiSummary.advisor_questions)
        : fallback.advisor_questions,
    meeting_agenda:
      normalizeArray(aiSummary?.meeting_agenda).length > 0
        ? normalizeArray(aiSummary.meeting_agenda)
        : fallback.meeting_agenda,
    checklist:
      normalizeArray(aiSummary?.checklist).length > 0
        ? normalizeArray(aiSummary.checklist)
        : fallback.checklist
  };
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
    String(data.risk_appetite || "").toLowerCase() === "low" &&
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

    const aiSummary = await generateAdvisorPrepAI({
      meeting,
      customer,
      chatMessages,
      questionLogs,
      missingInfo,
      concernTags,
      warnings,
      readinessScore
    });

    const fallbackSummary = buildAdvisorPrepFallback({
      meeting,
      customer,
      chatMessages,
      questionLogs,
      missingInfo,
      concernTags,
      warnings,
      readinessScore
    });

    const summary = mergeAdvisorPrepSummary(aiSummary, fallbackSummary);

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
