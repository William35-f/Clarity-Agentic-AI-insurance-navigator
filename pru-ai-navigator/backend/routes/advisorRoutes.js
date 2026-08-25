import express from "express";
import pool from "../db.js";
import {
  analyzeMeetingStatementAI,
  generateCustomerFollowUpAI,
  generateAdvisorMeetingAssistantAI,
  generateAdvisorPrepAI,
  generatePostMeetingRecordAI
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

function normalizeChecklistItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      text: String(item?.text || item || "").trim(),
      completed: Boolean(item?.completed)
    }))
    .filter((item) => item.text)
    .slice(0, 30);
}

function normalizeFollowUpTasks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      task: String(item?.task || item || "").trim(),
      owner: item?.owner === "Customer" ? "Customer" : "Advisor",
      completed: Boolean(item?.completed),
      outreach_sent_at: item?.outreach_sent_at || null,
      outreach_subject: String(item?.outreach_subject || "").trim(),
      outreach_recipient: String(item?.outreach_recipient || "").trim(),
      outreach_delivery_reference: String(item?.outreach_delivery_reference || "").trim(),
      outreach_delivery_status: String(item?.outreach_delivery_status || "").trim()
    }))
    .filter((item) => item.task)
    .slice(0, 30);
}

function maskEmail(value) {
  const [local, domain] = String(value || "").split("@");
  if (!local || !domain) return "Email unavailable";
  return `${local.slice(0, 1)}${"•".repeat(Math.max(3, local.length - 1))}@${domain}`;
}

async function logAdvisorActivity(executor, { advisorId, meetingId, activityType, title, details }) {
  await executor.execute(
    `INSERT INTO advisoractivitylog
     (advisor_id, meeting_id, activity_type, title, details)
     VALUES (?, ?, ?, ?, ?)`,
    [advisorId || null, meetingId || null, activityType, title, details || null]
  );
}

function parsePostMeetingRecord(record) {
  return {
    record_id: record.record_id,
    meeting_id: record.meeting_id,
    summary: record.summary,
    notes: record.notes,
    checklist: safeParseArray(record.checklist),
    follow_up_tasks: safeParseArray(record.follow_up_tasks),
    approval_status: record.approval_status,
    approved_at: record.approved_at,
    created_at: record.created_at,
    updated_at: record.updated_at
  };
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

router.get("/advisors", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT advisor_id, full_name, specialty, location
       FROM advisor
       ORDER BY full_name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get advisors error:", error);
    res.status(500).json({ success: false, message: "Failed to load advisors", error: error.message });
  }
});

router.get("/availability", async (req, res) => {
  try {
    const advisorId = Number(req.query.advisor_id);
    if (!advisorId) {
      return res.status(400).json({ success: false, message: "advisor_id is required" });
    }
    const [rows] = await pool.execute(
      `SELECT S.slot_id, S.advisor_id, S.start_datetime, S.end_datetime,
              S.meeting_type, S.is_booked, A.full_name AS advisor_name
       FROM advisorslot S
       JOIN advisor A ON S.advisor_id = A.advisor_id
       WHERE S.advisor_id = ?
         AND S.start_datetime >= NOW()
         AND S.start_datetime < DATE_ADD(NOW(), INTERVAL 7 DAY)
       ORDER BY S.start_datetime ASC`,
      [advisorId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get advisor availability error:", error);
    res.status(500).json({ success: false, message: "Failed to load availability", error: error.message });
  }
});

router.post("/availability", async (req, res) => {
  try {
    const advisorId = Number(req.body?.advisor_id);
    const date = String(req.body?.date || "").trim();
    const startTime = String(req.body?.start_time || "").trim();
    const endTime = String(req.body?.end_time || "").trim();
    const meetingType = req.body?.meeting_type === "Offline" ? "Offline" : "Online";

    if (!advisorId || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return res.status(400).json({ success: false, message: "Advisor, date, start time, and end time are required" });
    }

    const startDatetime = `${date} ${startTime}:00`;
    const endDatetime = `${date} ${endTime}:00`;
    const [validityRows] = await pool.execute(
      `SELECT
         (STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s') > NOW()
          AND STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s') < DATE_ADD(NOW(), INTERVAL 7 DAY)
          AND STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s') > STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s')) AS is_valid`,
      [startDatetime, startDatetime, endDatetime, startDatetime]
    );
    if (!validityRows[0]?.is_valid) {
      return res.status(400).json({
        success: false,
        message: "Availability must be in the future, end after it starts, and fall within the next 7 days"
      });
    }

    const [advisorRows] = await pool.execute(
      `SELECT advisor_id FROM advisor WHERE advisor_id = ?`,
      [advisorId]
    );
    if (advisorRows.length === 0) {
      return res.status(404).json({ success: false, message: "Advisor not found" });
    }

    const [conflicts] = await pool.execute(
      `SELECT slot_id FROM advisorslot
       WHERE advisor_id = ?
         AND start_datetime < ?
         AND end_datetime > ?
       LIMIT 1`,
      [advisorId, endDatetime, startDatetime]
    );
    if (conflicts.length > 0) {
      return res.status(409).json({ success: false, message: "This time overlaps an existing advisor slot" });
    }

    const [result] = await pool.execute(
      `INSERT INTO advisorslot
       (advisor_id, start_datetime, end_datetime, meeting_type, is_booked)
       VALUES (?, ?, ?, ?, FALSE)`,
      [advisorId, startDatetime, endDatetime, meetingType]
    );
    res.status(201).json({ success: true, slot_id: result.insertId, message: "Availability added for customer matching" });
  } catch (error) {
    console.error("Add advisor availability error:", error);
    res.status(500).json({ success: false, message: "Failed to add availability", error: error.message });
  }
});

router.delete("/availability/:slotId", async (req, res) => {
  try {
    const [result] = await pool.execute(
      `DELETE FROM advisorslot WHERE slot_id = ? AND is_booked = FALSE`,
      [req.params.slotId]
    );
    if (result.affectedRows === 0) {
      return res.status(409).json({ success: false, message: "Booked or missing slots cannot be removed" });
    }
    res.json({ success: true, message: "Availability removed" });
  } catch (error) {
    console.error("Remove advisor availability error:", error);
    res.status(500).json({ success: false, message: "Failed to remove availability", error: error.message });
  }
});

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

router.post("/meetings/:meetingId/analyze-statement", async (req, res) => {
  try {
    const statement = String(req.body?.statement || "").trim();
    if (!statement) {
      return res.status(400).json({
        success: false,
        message: "Customer statement is required"
      });
    }

    const context = await buildAdvisorChatContext({
      meetingId: req.params.meetingId
    });
    if (!context.meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    const analysis = await analyzeMeetingStatementAI({
      statement,
      customer: context.customer,
      meeting: context.meeting
    });

    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error("Meeting statement analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze customer statement",
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

        (SELECT COUNT(*)
         FROM missinginfo MI
         WHERE MI.customer_id = C.customer_id
           AND MI.is_answered = FALSE) AS missing_info_count,

        (SELECT COUNT(*)
         FROM questionlog QL
         WHERE QL.customer_id = C.customer_id
           AND QL.needs_advisor_clarification = TRUE) AS clarification_count,

        EXISTS(
          SELECT 1
          FROM advisorsummary APS
          WHERE APS.meeting_id = M.meeting_id
        ) AS has_prep_summary,

        PM.approval_status AS post_meeting_status,
        PM.follow_up_tasks,

        CASE
          WHEN LOWER(M.status) = 'completed' THEN 'Completed'
          WHEN EXISTS(
            SELECT 1 FROM advisorsummary APS2 WHERE APS2.meeting_id = M.meeting_id
          ) THEN 'Ready'
          WHEN EXISTS(
            SELECT 1 FROM missinginfo MI2
            WHERE MI2.customer_id = C.customer_id AND MI2.is_answered = FALSE
          ) THEN 'Needs attention'
          ELSE 'Not started'
        END AS preparation_status,

        A.advisor_id,
        A.full_name AS advisor_name,
        A.specialty AS advisor_specialty
       FROM meeting M
       JOIN customer C ON M.customer_id = C.customer_id
       JOIN advisor A ON M.advisor_id = A.advisor_id
       LEFT JOIN postmeetingrecord PM ON M.meeting_id = PM.meeting_id
       ORDER BY M.meeting_datetime DESC`
    );

    res.json({
      success: true,
      data: rows.map((row) => {
        const followUpTasks = safeParseArray(row.follow_up_tasks);
        const { follow_up_tasks: _followUpTasks, ...meeting } = row;
        return {
          ...meeting,
          follow_up_total: followUpTasks.length,
          follow_up_completed: followUpTasks.filter((task) => Boolean(task?.completed)).length,
          follow_up_sent: followUpTasks.filter((task) => Boolean(task?.outreach_sent_at)).length
        };
      })
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

router.put("/meetings/:meetingId/summary/checklist", async (req, res) => {
  try {
    const checklist = Array.isArray(req.body?.checklist)
      ? uniqueNonEmpty(req.body.checklist).slice(0, 30)
      : null;

    if (!checklist || checklist.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one checklist item is required"
      });
    }

    const [summaryRows] = await pool.execute(
      `SELECT summary_id
       FROM advisorsummary
       WHERE meeting_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.params.meetingId]
    );

    if (summaryRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Generate the preparation summary before editing its checklist"
      });
    }

    await pool.execute(
      `UPDATE advisorsummary
       SET checklist = ?
       WHERE summary_id = ?`,
      [JSON.stringify(checklist), summaryRows[0].summary_id]
    );

    res.json({
      success: true,
      data: { checklist }
    });
  } catch (error) {
    console.error("Update advisor checklist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update advisor checklist",
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

router.get("/meetings/:meetingId/post-meeting", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM postmeetingrecord WHERE meeting_id = ? LIMIT 1`,
      [req.params.meetingId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Post-meeting record not found" });
    }
    res.json({ success: true, data: parsePostMeetingRecord(rows[0]) });
  } catch (error) {
    console.error("Get post-meeting record error:", error);
    res.status(500).json({ success: false, message: "Failed to load post-meeting record", error: error.message });
  }
});

router.post("/meetings/:meetingId/post-meeting/generate", async (req, res) => {
  try {
    const context = await buildAdvisorChatContext({ meetingId: req.params.meetingId });
    if (!context.meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    const checklist = normalizeChecklistItems(req.body?.checklist);
    const transcript = Array.isArray(req.body?.transcript) ? req.body.transcript : [];
    const notes = Array.isArray(req.body?.notes) ? req.body.notes : [];
    const generated = await generatePostMeetingRecordAI({
      customer: context.customer,
      meeting: context.meeting,
      transcript,
      notes,
      checklist
    });
    const notesText = notes.map((item) => String(item || "").trim()).filter(Boolean).join("\n\n");

    await pool.execute(
      `INSERT INTO postmeetingrecord
       (meeting_id, summary, notes, checklist, follow_up_tasks, approval_status)
       VALUES (?, ?, ?, ?, ?, 'Draft')
       ON DUPLICATE KEY UPDATE
         summary = VALUES(summary), notes = VALUES(notes), checklist = VALUES(checklist),
         follow_up_tasks = VALUES(follow_up_tasks), approval_status = 'Draft', approved_at = NULL`,
      [
        req.params.meetingId,
        generated.summary,
        notesText,
        JSON.stringify(checklist),
        JSON.stringify(generated.follow_up_tasks)
      ]
    );

    const [rows] = await pool.execute(
      `SELECT * FROM postmeetingrecord WHERE meeting_id = ? LIMIT 1`,
      [req.params.meetingId]
    );
    res.json({ success: true, data: parsePostMeetingRecord(rows[0]) });
  } catch (error) {
    console.error("Generate post-meeting record error:", error);
    res.status(500).json({ success: false, message: "Failed to generate post-meeting record", error: error.message });
  }
});

router.put("/meetings/:meetingId/post-meeting", async (req, res) => {
  try {
    const summary = String(req.body?.summary || "").trim();
    const notes = String(req.body?.notes || "").trim();
    const checklist = normalizeChecklistItems(req.body?.checklist);
    const followUpTasks = normalizeFollowUpTasks(req.body?.follow_up_tasks);
    if (!summary) {
      return res.status(400).json({ success: false, message: "Post-meeting summary is required" });
    }

    const [result] = await pool.execute(
      `UPDATE postmeetingrecord
       SET summary = ?, notes = ?, checklist = ?, follow_up_tasks = ?
       WHERE meeting_id = ?`,
      [summary, notes, JSON.stringify(checklist), JSON.stringify(followUpTasks), req.params.meetingId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Post-meeting record not found" });
    }
    const [rows] = await pool.execute(
      `SELECT * FROM postmeetingrecord WHERE meeting_id = ? LIMIT 1`,
      [req.params.meetingId]
    );
    res.json({ success: true, data: parsePostMeetingRecord(rows[0]) });
  } catch (error) {
    console.error("Save post-meeting record error:", error);
    res.status(500).json({ success: false, message: "Failed to save post-meeting record", error: error.message });
  }
});

router.post("/meetings/:meetingId/post-meeting/approve", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const summary = String(req.body?.summary || "").trim();
    const notes = String(req.body?.notes || "").trim();
    const checklist = normalizeChecklistItems(req.body?.checklist);
    const followUpTasks = normalizeFollowUpTasks(req.body?.follow_up_tasks);
    if (!summary) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Review the summary before approval" });
    }

    const [result] = await connection.execute(
      `UPDATE postmeetingrecord
       SET summary = ?, notes = ?, checklist = ?, follow_up_tasks = ?,
           approval_status = 'Approved', approved_at = NOW()
       WHERE meeting_id = ?`,
      [summary, notes, JSON.stringify(checklist), JSON.stringify(followUpTasks), req.params.meetingId]
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Post-meeting record not found" });
    }
    await connection.execute(
      `UPDATE meeting SET status = 'Completed' WHERE meeting_id = ?`,
      [req.params.meetingId]
    );
    const [activityRows] = await connection.execute(
      `SELECT M.advisor_id, C.full_name AS customer_name
       FROM meeting M JOIN customer C ON M.customer_id = C.customer_id
       WHERE M.meeting_id = ? LIMIT 1`,
      [req.params.meetingId]
    );
    if (activityRows[0]) {
      await logAdvisorActivity(connection, {
        advisorId: activityRows[0].advisor_id,
        meetingId: Number(req.params.meetingId),
        activityType: "MEETING_APPROVED",
        title: `Approved completed record for ${activityRows[0].customer_name}`,
        details: "Meeting record approved and released to the Follow-up Agent."
      });
    }
    await connection.commit();

    const [rows] = await pool.execute(
      `SELECT * FROM postmeetingrecord WHERE meeting_id = ? LIMIT 1`,
      [req.params.meetingId]
    );
    res.json({ success: true, data: parsePostMeetingRecord(rows[0]) });
  } catch (error) {
    await connection.rollback();
    console.error("Approve post-meeting record error:", error);
    res.status(500).json({ success: false, message: "Failed to approve post-meeting record", error: error.message });
  } finally {
    connection.release();
  }
});

router.get("/follow-up-tasks", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT PM.record_id, PM.meeting_id, PM.follow_up_tasks, PM.approval_status,
              PM.updated_at, M.meeting_datetime, M.product_interest, M.status AS meeting_status,
              C.customer_id, C.full_name AS customer_name,
              A.full_name AS advisor_name
       FROM postmeetingrecord PM
       JOIN meeting M ON PM.meeting_id = M.meeting_id
       JOIN customer C ON M.customer_id = C.customer_id
       JOIN advisor A ON M.advisor_id = A.advisor_id
       WHERE PM.approval_status = 'Approved' AND LOWER(M.status) = 'completed'
       ORDER BY PM.updated_at DESC`
    );

    const tasks = rows.flatMap((row) =>
      safeParseArray(row.follow_up_tasks).map((task, taskIndex) => ({
        record_id: row.record_id,
        meeting_id: row.meeting_id,
        task_index: taskIndex,
        task: String(task?.task || task || "").trim(),
        owner: task?.owner === "Customer" ? "Customer" : "Advisor",
        completed: Boolean(task?.completed),
        outreach_sent_at: task?.outreach_sent_at || null,
        outreach_subject: String(task?.outreach_subject || "").trim(),
        outreach_recipient: String(task?.outreach_recipient || "").trim(),
        outreach_delivery_reference: String(task?.outreach_delivery_reference || "").trim(),
        outreach_delivery_status: String(task?.outreach_delivery_status || "").trim(),
        approval_status: row.approval_status,
        meeting_status: row.meeting_status,
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        advisor_name: row.advisor_name,
        meeting_datetime: row.meeting_datetime,
        product_interest: row.product_interest,
        updated_at: row.updated_at
      }))
    ).filter((task) => task.task);

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Get follow-up tasks error:", error);
    res.status(500).json({ success: false, message: "Failed to load follow-up tasks", error: error.message });
  }
});

router.put("/follow-up-tasks/:recordId/:taskIndex", async (req, res) => {
  try {
    const recordId = Number(req.params.recordId);
    const taskIndex = Number(req.params.taskIndex);
    const [rows] = await pool.execute(
      `SELECT PM.follow_up_tasks, PM.meeting_id, M.advisor_id, C.full_name AS customer_name
       FROM postmeetingrecord PM
       JOIN meeting M ON PM.meeting_id = M.meeting_id
       JOIN customer C ON M.customer_id = C.customer_id
       WHERE PM.record_id = ? LIMIT 1`,
      [recordId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Follow-up record not found" });
    }

    const tasks = safeParseArray(rows[0].follow_up_tasks);
    if (!Number.isInteger(taskIndex) || taskIndex < 0 || taskIndex >= tasks.length) {
      return res.status(404).json({ success: false, message: "Follow-up task not found" });
    }

    const updatedTask = {
      task: String(req.body?.task ?? tasks[taskIndex]?.task ?? "").trim(),
      owner: req.body?.owner === "Customer" ? "Customer" : "Advisor",
      completed: Boolean(req.body?.completed),
      outreach_sent_at: tasks[taskIndex]?.outreach_sent_at || null,
      outreach_subject: String(tasks[taskIndex]?.outreach_subject || "").trim(),
      outreach_recipient: String(tasks[taskIndex]?.outreach_recipient || "").trim(),
      outreach_delivery_reference: String(tasks[taskIndex]?.outreach_delivery_reference || "").trim(),
      outreach_delivery_status: String(tasks[taskIndex]?.outreach_delivery_status || "").trim()
    };
    if (!updatedTask.task) {
      return res.status(400).json({ success: false, message: "Task description is required" });
    }

    tasks[taskIndex] = updatedTask;
    await pool.execute(
      `UPDATE postmeetingrecord SET follow_up_tasks = ? WHERE record_id = ?`,
      [JSON.stringify(tasks), recordId]
    );
    await logAdvisorActivity(pool, {
      advisorId: rows[0].advisor_id,
      meetingId: rows[0].meeting_id,
      activityType: "FOLLOW_UP_UPDATED",
      title: `Updated follow-up for ${rows[0].customer_name}`,
      details: `${updatedTask.owner} task marked ${updatedTask.completed ? "completed" : "open"}: ${updatedTask.task}`
    });
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    console.error("Update follow-up task error:", error);
    res.status(500).json({ success: false, message: "Failed to update follow-up task", error: error.message });
  }
});

router.post("/follow-up-tasks/:recordId/:taskIndex/generate-message", async (req, res) => {
  try {
    const recordId = Number(req.params.recordId);
    const taskIndex = Number(req.params.taskIndex);
    const [rows] = await pool.execute(
      `SELECT PM.summary, PM.follow_up_tasks, PM.approval_status,
              M.meeting_id, M.meeting_datetime, M.product_interest, M.status,
              C.customer_id, C.full_name AS customer_name,
              A.advisor_id, A.full_name AS advisor_name
       FROM postmeetingrecord PM
       JOIN meeting M ON PM.meeting_id = M.meeting_id
       JOIN customer C ON M.customer_id = C.customer_id
       JOIN advisor A ON M.advisor_id = A.advisor_id
       WHERE PM.record_id = ? LIMIT 1`,
      [recordId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Follow-up record not found" });
    const row = rows[0];
    if (row.approval_status !== "Approved" || String(row.status).toLowerCase() !== "completed") {
      return res.status(409).json({ success: false, message: "Customer outreach is available only for approved completed meetings" });
    }
    const tasks = safeParseArray(row.follow_up_tasks);
    if (!Number.isInteger(taskIndex) || taskIndex < 0 || taskIndex >= tasks.length) {
      return res.status(404).json({ success: false, message: "Follow-up task not found" });
    }
    const message = await generateCustomerFollowUpAI({
      customer: { customer_id: row.customer_id, full_name: row.customer_name },
      advisor: { advisor_id: row.advisor_id, full_name: row.advisor_name },
      meeting: { meeting_id: row.meeting_id, meeting_datetime: row.meeting_datetime, product_interest: row.product_interest },
      task: String(tasks[taskIndex]?.task || "").trim(),
      summary: row.summary
    });
    await logAdvisorActivity(pool, {
      advisorId: row.advisor_id,
      meetingId: row.meeting_id,
      activityType: "EMAIL_DRAFT_GENERATED",
      title: `Generated email draft for ${row.customer_name}`,
      details: message.subject
    });
    res.json({ success: true, data: message });
  } catch (error) {
    console.error("Generate customer follow-up error:", error);
    res.status(500).json({ success: false, message: "Failed to generate customer message", error: error.message });
  }
});

router.post("/follow-up-tasks/:recordId/:taskIndex/send-message", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const recordId = Number(req.params.recordId);
    const taskIndex = Number(req.params.taskIndex);
    const subject = String(req.body?.subject || "").trim();
    const body = String(req.body?.body || "").trim();
    if (!subject || !body) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Review the subject and message before sending" });
    }
    const [rows] = await connection.execute(
      `SELECT PM.meeting_id, PM.follow_up_tasks, PM.approval_status,
              M.status, M.customer_id, M.advisor_id,
              C.full_name AS customer_name, CC.email AS customer_email
       FROM postmeetingrecord PM
       JOIN meeting M ON PM.meeting_id = M.meeting_id
       JOIN customer C ON M.customer_id = C.customer_id
       LEFT JOIN customercontact CC ON M.customer_id = CC.customer_id
       WHERE PM.record_id = ? FOR UPDATE`,
      [recordId]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Follow-up record not found" });
    }
    const row = rows[0];
    if (row.approval_status !== "Approved" || String(row.status).toLowerCase() !== "completed") {
      await connection.rollback();
      return res.status(409).json({ success: false, message: "Only completed meeting follow-ups can be sent" });
    }
    if (!row.customer_email) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: "Add a customer email before sending this follow-up" });
    }
    const tasks = safeParseArray(row.follow_up_tasks);
    if (!Number.isInteger(taskIndex) || taskIndex < 0 || taskIndex >= tasks.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Follow-up task not found" });
    }
    const sentAt = new Date().toISOString();
    const deliveryReference = `CL-${Date.now().toString(36).toUpperCase()}-${recordId}`;
    const maskedRecipient = maskEmail(row.customer_email);
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      outreach_sent_at: sentAt,
      outreach_subject: subject,
      outreach_recipient: maskedRecipient,
      outreach_delivery_reference: deliveryReference,
      outreach_delivery_status: "Demo delivered"
    };
    await connection.execute(
      `INSERT INTO advisoremailpreview
       (meeting_id, subject, body, recipient_email, delivery_status, delivery_reference)
       VALUES (?, ?, ?, ?, 'Demo delivered', ?)`,
      [row.meeting_id, subject, body, row.customer_email, deliveryReference]
    );
    await connection.execute(
      `UPDATE postmeetingrecord SET follow_up_tasks = ? WHERE record_id = ?`,
      [JSON.stringify(tasks), recordId]
    );
    await logAdvisorActivity(connection, {
      advisorId: row.advisor_id,
      meetingId: row.meeting_id,
      activityType: "DEMO_EMAIL_SENT",
      title: `Sent follow-up email to ${row.customer_name}`,
      details: `${subject} · ${maskedRecipient} · ${deliveryReference}`
    });
    await connection.commit();
    res.json({
      success: true,
      data: {
        customer_id: row.customer_id,
        sent_at: sentAt,
        subject,
        masked_recipient: maskedRecipient,
        delivery_reference: deliveryReference,
        delivery_status: "Demo delivered"
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error("Send customer follow-up error:", error);
    res.status(500).json({ success: false, message: "Failed to send customer message", error: error.message });
  } finally {
    connection.release();
  }
});

router.get("/activities", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT L.activity_id, L.activity_type, L.title, L.details, L.created_at,
              L.meeting_id, A.full_name AS advisor_name, C.full_name AS customer_name,
              M.product_interest
       FROM advisoractivitylog L
       LEFT JOIN advisor A ON L.advisor_id = A.advisor_id
       LEFT JOIN meeting M ON L.meeting_id = M.meeting_id
       LEFT JOIN customer C ON M.customer_id = C.customer_id
       ORDER BY L.created_at DESC, L.activity_id DESC
       LIMIT 100`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get advisor activities error:", error);
    res.status(500).json({ success: false, message: "Failed to load advisor activities", error: error.message });
  }
});

export default router;
