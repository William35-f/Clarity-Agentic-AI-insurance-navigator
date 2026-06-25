import express from "express";
import pool from "../db.js";

const router = express.Router();
import { selectMeetingSlotAI } from "../services/openaiService.js";

function normalizeText(value) {
  if (!value) return "";
  return String(value).trim().toLowerCase();
}

function toDisplayMeetingType(value) {
  const normalized = normalizeText(value);

  if (normalized === "offline" || normalized === "in-person" || normalized === "in person") {
    return "In-person";
  }

  if (normalized === "online") {
    return "Online";
  }

  return value || "Not provided";
}

function toDbMeetingType(value) {
  return toDisplayMeetingType(value) === "In-person" ? "Offline" : value;
}

function getMeetingLocation(meetingType) {
  if (toDisplayMeetingType(meetingType) === "Online") {
    return {
      label: "Microsoft Teams",
      details: "https://teams.microsoft.com/l/meetup-join/demo-clarity-meeting",
      note: "Demo-only Teams link. No real Teams meeting was created.",
    };
  }

  return {
    label: "Prudential Tower, 30 Cecil Street, #01-01, Singapore 049712",
    details: "",
    note: "Final meeting details can be confirmed by the Financial Representative.",
  };
}

function buildMeetingDetails(slot, { meetingId = null, customer = null, productInterest = null, aiReason = "" } = {}) {
  const meetingType = toDisplayMeetingType(slot.meeting_type);

  return {
    meeting_id: meetingId,
    customer_id: customer?.customer_id || null,
    customer_name: customer?.full_name || null,
    advisor_id: slot.advisor_id,
    advisor_name: slot.full_name || slot.advisor_name,
    advisor_email: slot.email || slot.advisor_email,
    advisor_specialty: slot.specialty,
    start_datetime: slot.start_datetime,
    end_datetime: slot.end_datetime,
    meeting_type: meetingType,
    location: getMeetingLocation(meetingType),
    product_interest: productInterest || slot.product_interest || "General Prudential ILP",
    ai_reason: aiReason || slot.match_reason || "",
  };
}

function normalizeAiMeetingType(value) {
  const display = toDisplayMeetingType(value);
  return display === "Online" || display === "In-person" ? display : "unclear";
}

function detectProductInterest(customer, questions) {
  const text = `
    ${customer.main_goal || ""}
    ${customer.risk_appetite || ""}
    ${questions.map((q) => q.question).join(" ")}
  `.toLowerCase();

  if (
    text.includes("pruvantage assure") ||
    text.includes("assure series") ||
    text.includes("wealth assure") ||
    text.includes("wealth assure-style")
  ) {
    return {
      product_category: "PRUVantage Assure Series",
      confidence: "High",
      reason:
        "Customer showed interest in investment-linked wealth growth with stronger Wealth Assure-style protection features.",
    };
  }

  if (
    text.includes("pruvantage wealth iii") ||
    text.includes("wealth iii") ||
    text.includes("sgd") ||
    text.includes("pruprime cio") ||
    text.includes("legacy planning") ||
    text.includes("sgd-based")
  ) {
    return {
      product_category: "PRUVantage Wealth III (SGD)",
      confidence: "High",
      reason:
        "Customer showed interest in SGD-based long-term wealth planning, income potential, legacy planning, or access to PRUPrime CIO Funds.",
    };
  }

  if (
    text.includes("pruvantage wealth ii") ||
    text.includes("wealth ii") ||
    text.includes("usd") ||
    text.includes("usd-denominated") ||
    text.includes("us dollar")
  ) {
    return {
      product_category: "PRUVantage Wealth II (USD)",
      confidence: "High",
      reason:
        "Customer showed interest in USD exposure or USD-denominated wealth planning.",
    };
  }

  if (
    text.includes("pruvantage prosper") ||
    text.includes("prosper") ||
    text.includes("dividends") ||
    text.includes("growth/flex") ||
    text.includes("growth flex") ||
    text.includes("legacy planning")
  ) {
    return {
      product_category: "PRUVantage Prosper",
      confidence: "High",
      reason:
        "Customer showed interest in long-term wealth, possible dividends, Growth/Flex account planning, or legacy planning.",
    };
  }

  if (
    text.includes("pruunited wealth") ||
    text.includes("united wealth") ||
    text.includes("5-year") ||
    text.includes("10-year") ||
    text.includes("shorter premium term") ||
    text.includes("income, growth")
  ) {
    return {
      product_category: "PRUUnited Wealth",
      confidence: "High",
      reason:
        "Customer showed interest in income, growth, protection, wealth continuity, or a shorter premium term.",
    };
  }

  if (
    text.includes("prulink investgrowth") ||
    text.includes("link investgrowth") ||
    text.includes("cash funding") ||
    text.includes("cpf") ||
    text.includes("srs") ||
    text.includes("flexible investment-linked")
  ) {
    return {
      product_category: "PRULink InvestGrowth",
      confidence: "High",
      reason:
        "Customer showed interest in flexible investment-linked wealth growth with cash, CPF, or SRS funding.",
    };
  }

  if (
    text.includes("pruactive linkguard") ||
    text.includes("linkguard") ||
    text.includes("protection") ||
    text.includes("death coverage") ||
    text.includes("terminal illness") ||
    text.includes("total permanent disability") ||
    text.includes("critical illness")
  ) {
    return {
      product_category: "PRUActive LinkGuard",
      confidence: "High",
      reason:
        "Customer showed interest in protection, death coverage, terminal illness, total permanent disability, or critical illness.",
    };
  }

  return {
    product_category: "General Prudential ILP",
    confidence: "Low",
    reason:
      "Customer has shown general interest in Prudential investment-linked insurance, but no specific product preference is clear yet.",
  };
}

function isSpecialist(slot, productInterest) {
  return normalizeText(slot.specialty) === normalizeText(productInterest);
}

function isGeneralAdvisor(slot) {
  return (
    normalizeText(slot.specialty) === normalizeText("General Prudential ILP")
  );
}

function toDateTime(date, time) {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00`);
}

function padTime(value) {
  return String(value).padStart(2, "0");
}

function getMinutesDifference(dateA, dateB) {
  const diff = new Date(dateA).getTime() - new Date(dateB).getTime();
  return Math.round(Math.abs(diff) / 60000);
}

function formatTimeHHmm(date) {
  const dt = new Date(date);
  return `${padTime(dt.getHours())}:${padTime(dt.getMinutes())}`;
}

function isSlotInsideRequestedWindow(slot, preferredDate, startTime, endTime) {
  if (!slot.start_datetime || !slot.end_datetime) return false;
  const slotStart = new Date(slot.start_datetime);
  const slotEnd = new Date(slot.end_datetime);
  const slotDate = slotStart.toISOString().split("T")[0];

  if (slotDate !== preferredDate) return false;

  const slotStartHM = formatTimeHHmm(slotStart);
  const slotEndHM = formatTimeHHmm(slotEnd);

  return slotStartHM >= startTime && slotEndHM <= endTime;
}

function formatSlot(slot) {
  const start = new Date(slot.start_datetime);
  const end = new Date(slot.end_datetime);
  const displayTime = `${start.toLocaleDateString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })} ${start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  return {
    slot_id: slot.slot_id,
    advisor_id: slot.advisor_id,
    advisor_name: slot.full_name,
    advisor_email: slot.email,
    specialty: slot.specialty,
    meeting_type: slot.meeting_type,
    start_datetime: slot.start_datetime,
    end_datetime: slot.end_datetime,
    display_time: displayTime,
    is_specialist: slot.is_specialist,
    score: slot.score,
    match_reason: slot.match_reason,
  };
}

function scoreSlot(slot, preferences, productInterest) {
  let score = 0;
  const requestedStart = toDateTime(
    preferences.preferred_date,
    preferences.preferred_start_time,
  );

  if (isSpecialist(slot, productInterest)) {
    score += 200;
  }

  if (
    isSlotInsideRequestedWindow(
      slot,
      preferences.preferred_date,
      preferences.preferred_start_time,
      preferences.preferred_end_time,
    )
  ) {
    score += 100;
    slot.is_inside_window = true;
  } else {
    slot.is_inside_window = false;
  }

  if (isGeneralAdvisor(slot)) {
    score += 40;
  }

  if (
    preferences.meeting_type === "Either" ||
    preferences.meeting_type === "Unknown" ||
    normalizeText(slot.meeting_type) === normalizeText(preferences.meeting_type)
  ) {
    score += 30;
  }

  if (requestedStart) {
    score -= getMinutesDifference(slot.start_datetime, requestedStart) * 0.5;
  }

  score -= Number(slot.workload_score || 0) * 0.8;

  if (slot.specialty && slot.specialty.includes("General Prudential ILP")) {
    slot.is_general = true;
  }

  return score;
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
      advisors,
    });
  } catch (error) {
    console.error("Debug advisors error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
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
        message: "customer_id, meeting_type, and meeting_datetime are required",
      });
    }

    const [customerRows] = await pool.execute(
      `SELECT *
       FROM customer
       WHERE customer_id = ?`,
      [customer_id],
    );

    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const customer = customerRows[0];

    const [questionRows] = await pool.execute(
      `SELECT question
       FROM questionlog
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [customer_id],
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
        interest.confidence,
      ],
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
      [interest.product_category],
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
        ["General Prudential ILP"],
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
         LIMIT 1`,
      );

      advisor = anyAdvisorRows[0];

      console.log("Any advisor fallback:", advisor);
    }

    if (!advisor) {
      return res.status(404).json({
        success: false,
        message: "No advisors found in advisor table.",
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
        interest.product_category,
      ],
    );

    await pool.execute(
      `UPDATE advisor
       SET workload_score = workload_score + 1
       WHERE advisor_id = ?`,
      [advisor.advisor_id],
    );

    res.json({
      success: true,
      message: "Meeting booked successfully",
      meeting_id: meetingResult.insertId,
      product_interest: interest,
      matched_advisor: advisor,
    });
  } catch (error) {
    console.error("Meeting booking error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to book meeting",
      error: error.message,
    });
  }
});

router.post("/recommend-natural", async (req, res) => {
  try {
    const { customer_id, message } = req.body || {};
    const availabilityMessage = typeof message === "string" ? message.trim() : "";

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: "customer_id is required",
      });
    }

    if (!availabilityMessage) {
      return res.status(400).json({
        success: false,
        message: "Please describe when you are free.",
      });
    }

    const [customerRows] = await pool.execute(
      `SELECT * FROM customer WHERE customer_id = ?`,
      [customer_id],
    );

    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const customer = customerRows[0];

    const [questionRows] = await pool.execute(
      `SELECT question
       FROM questionlog
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [customer_id],
    );

    const interest = detectProductInterest(customer, questionRows);
    const productInterest = interest.product_category;

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
         AND S.start_datetime >= NOW()
         AND S.start_datetime < DATE_ADD(NOW(), INTERVAL 7 DAY)
       ORDER BY S.start_datetime ASC
       LIMIT 80`,
    );

    if (!slotRows || slotRows.length === 0) {
      return res.json({
        success: true,
        needs_clarification: false,
        recommendation_type: "no_slots",
        understood_availability: null,
        product_interest: productInterest,
        recommendation: null,
        specialist_next_available: [],
        closest_available_slots: [],
        other_available_slots: [],
        message:
          "No available advisor slots were found in the next 7 days.",
      });
    }

    const candidateSlots = slotRows.map((slot) => ({
      slot_id: slot.slot_id,
      advisor_id: slot.advisor_id,
      advisor_name: slot.full_name,
      advisor_email: slot.email,
      advisor_specialisation: slot.specialty,
      advisor_location: slot.location,
      meeting_type: toDisplayMeetingType(slot.meeting_type),
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      workload_score: slot.workload_score,
    }));

    const customerContext = {
      customer_id: customer.customer_id,
      full_name: customer.full_name,
      age: customer.age,
      occupation: customer.occupation,
      monthly_income: customer.monthly_income,
      risk_appetite: customer.risk_appetite,
      main_goal: customer.main_goal,
      existing_insurance: customer.existing_insurance,
      preferred_meeting_type: normalizeAiMeetingType(customer.preferred_meeting_type),
    };

    const aiDecision = await selectMeetingSlotAI({
      availabilityText: availabilityMessage,
      customer: customerContext,
      productInterest,
      candidateSlots,
    });

    if (!aiDecision) {
      return res.status(502).json({
        success: false,
        message:
          "Clarity could not interpret the available advisor slots. Please try again.",
      });
    }

    const understoodAvailability = aiDecision.understood_availability || {};
    const aiMeetingType = normalizeAiMeetingType(understoodAvailability.meeting_type);

    if (aiMeetingType === "unclear" || !aiDecision.selected_slot_id) {
      return res.json({
        success: true,
        needs_clarification: true,
        understood_availability: {
          summary:
            understoodAvailability.summary ||
            "Clarity needs a meeting type before checking matching advisor slots.",
          time_preference: understoodAvailability.time_preference || "unclear",
          meeting_type: "unclear",
          flexibility: understoodAvailability.flexibility || "unclear",
          used_profile_meeting_type:
            understoodAvailability.used_profile_meeting_type === true,
          profile_meeting_type_used:
            understoodAvailability.profile_meeting_type_used || null,
        },
        clarification_question:
          "Please choose a meeting type so Clarity can search matching advisor slots.",
      });
    }

    const candidateSlotIds = new Set(slotRows.map((slot) => Number(slot.slot_id)));
    const selectedSlotId = Number(aiDecision.selected_slot_id);

    if (!candidateSlotIds.has(selectedSlotId)) {
      return res.status(409).json({
        success: false,
        message:
          "The selected slot is no longer available. Please try again.",
      });
    }

    const [validatedRows] = await pool.execute(
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
       WHERE S.slot_id = ?
         AND S.is_booked = FALSE
         AND S.start_datetime >= NOW()
         AND S.start_datetime < DATE_ADD(NOW(), INTERVAL 7 DAY)`,
      [selectedSlotId],
    );

    if (validatedRows.length === 0) {
      return res.status(409).json({
        success: false,
        message:
          "The selected slot is no longer available. Please try again.",
      });
    }

    const selectedSlot = validatedRows[0];
    const backupSlotIds = Array.isArray(aiDecision.backup_slot_ids)
      ? aiDecision.backup_slot_ids
          .map((slotId) => Number(slotId))
          .filter((slotId) => candidateSlotIds.has(slotId) && slotId !== selectedSlotId)
          .slice(0, 5)
      : [];

    const backupSlots = backupSlotIds
      .map((slotId) => slotRows.find((slot) => Number(slot.slot_id) === slotId))
      .filter(Boolean)
      .map((slot) => ({
        ...formatSlot(slot),
        meeting_type: toDisplayMeetingType(slot.meeting_type),
        match_reason:
          "AI selected this as a backup from available advisor slots in the next 7 days.",
      }));

    const isSpecialistSlot = isSpecialist(selectedSlot, productInterest);
    const recommendation = {
      ...formatSlot(selectedSlot),
      meeting_type: toDisplayMeetingType(selectedSlot.meeting_type),
      is_specialist: isSpecialistSlot,
      match_reason:
        aiDecision.advisor_reason ||
        "Clarity selected this slot from real available advisor slots in the next 7 days.",
      product_interest: productInterest,
      location: getMeetingLocation(selectedSlot.meeting_type),
    };

    const understood = {
      summary: understoodAvailability.summary || availabilityMessage,
      time_preference: understoodAvailability.time_preference || "unclear",
      meeting_type: aiMeetingType,
      flexibility: understoodAvailability.flexibility || "unclear",
      used_profile_meeting_type:
        understoodAvailability.used_profile_meeting_type === true,
      profile_meeting_type_used:
        understoodAvailability.profile_meeting_type_used || null,
    };

    res.json({
      success: true,
      needs_clarification: false,
      understood_availability: understood,
      product_interest: productInterest,
      recommendation_type: "ai_selected_slot",
      message:
        aiDecision.user_message ||
        "Clarity matched your availability with a real advisor slot in the next 7 days.",
      recommendation,
      ai_decision: {
        selected_slot_id: selectedSlotId,
        backup_slot_ids: backupSlotIds,
        advisor_reason: recommendation.match_reason,
      },
      specialist_next_available: [],
      closest_available_slots: backupSlots,
      other_available_slots: [],
    });
  } catch (error) {
    console.error("Natural scheduling recommendation error:", error);

    res.status(500).json({
      success: false,
      message: "No matching advisor slot was found in the next 7 days. Try another time preference or meeting type.",
    });
  }
});

router.post("/confirm", async (req, res) => {
  try {
    const { customer_id, slot_id, product_interest, ai_reason } = req.body || {};

    if (!customer_id || !slot_id) {
      return res.status(400).json({
        success: false,
        message: "customer_id and slot_id are required",
      });
    }

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
        A.location
       FROM advisorslot S
       JOIN advisor A ON S.advisor_id = A.advisor_id
       WHERE S.slot_id = ?
         AND S.is_booked = FALSE
         AND S.start_datetime >= NOW()
         AND S.start_datetime < DATE_ADD(NOW(), INTERVAL 7 DAY)`,
      [slot_id],
    );

    if (slotRows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "The selected slot is no longer available. Please try again.",
      });
    }

    const slot = slotRows[0];

    const [customerRows] = await pool.execute(
      `SELECT *
       FROM customer
       WHERE customer_id = ?`,
      [customer_id],
    );

    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const customer = customerRows[0];

    const [updateResult] = await pool.execute(
      `UPDATE advisorslot
       SET is_booked = TRUE
       WHERE slot_id = ?
         AND is_booked = FALSE
         AND start_datetime >= NOW()
         AND start_datetime < DATE_ADD(NOW(), INTERVAL 7 DAY)`,
      [slot_id],
    );

    if (updateResult.affectedRows === 0) {
      return res.status(409).json({
        success: false,
        message: "The selected slot is no longer available. Please try again.",
      });
    }

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
        product_interest || "General Prudential ILP",
      ],
    );

    await pool.execute(
      `UPDATE advisor
       SET workload_score = workload_score + 1
       WHERE advisor_id = ?`,
      [slot.advisor_id],
    );

    res.json({
      success: true,
      message: "Meeting confirmed successfully",
      meeting_id: meetingResult.insertId,
      data: buildMeetingDetails(slot, {
        meetingId: meetingResult.insertId,
        customer,
        productInterest: product_interest,
        aiReason: ai_reason,
      }),
    });
  } catch (error) {
    console.error("Confirm meeting error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to confirm meeting",
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
        M.slot_id,
        M.meeting_type,
        M.meeting_datetime,
        M.product_interest,
        M.status,
        S.end_datetime,

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
       LEFT JOIN advisorslot S ON M.slot_id = S.slot_id
       WHERE M.meeting_id = ?`,
      [meetingId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    res.json({
      success: true,
      data: {
        ...rows[0],
        meeting_type: toDisplayMeetingType(rows[0].meeting_type),
        meeting_location: getMeetingLocation(rows[0].meeting_type),
      },
    });
  } catch (error) {
    console.error("Get meeting error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get meeting",
      error: error.message,
    });
  }
});

export default router;

/*
Demo booking phrases for testing:
1. "I am interested in PRUVantage Prosper and I am free on 2026-06-22 from 3 PM to 5 PM. Online is fine."
2. "I want to understand PRUVantage Wealth III and I am free on 2026-06-24 from 2 PM to 4 PM. I prefer online."
3. "I am asking about PRUVantage Wealth II USD. I am free on 2026-06-26 evening and I prefer online."
4. "I want to discuss PRUUnited Wealth. I am free on 2026-06-25 from 10 AM to 12 PM and I prefer online."
5. "I want to know more about PRUActive LinkGuard. I am free on 2026-06-23 from 1 PM to 4 PM and I prefer offline."
6. "I want PRUVantage Prosper but I am only free on 2026-06-23 morning online."
7. "I prefer the product specialist, but I am also okay with the earliest available advisor."
*/
