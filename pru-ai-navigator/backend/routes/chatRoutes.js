import express from "express";
import pool from "../db.js";
import { askInsuranceAI } from "../services/openaiService.js";
import { prudentialKnowledgeText } from "../data/prudentialKnowledgeText.js";

const router = express.Router();

const ALLOWED_EXPLANATION_MODES = new Set([
  "simple",
  "detailed",
  "comparison",
  "advisor_summary",
]);

const MISSING_INFO_FIELD_ALIASES = {
  monthly_income: ["monthly income", "monthly salary", "salary", "monthly pay"],
  risk_appetite: ["risk appetite", "risk tolerance", "investment risk comfort"],
  main_goal: ["main goal", "financial goal", "goal", "objective"],
  existing_insurance: [
    "existing insurance",
    "insurance coverage",
    "current insurance",
    "coverage",
  ],
  preferred_meeting_type: [
    "preferred meeting type",
    "meeting type",
    "meeting preference",
  ],
};

const RELATED_PRODUCT_FALLBACK = "General Prudential ILP";

const RELATED_PRODUCT_LABELS = [
  "Health Protection",
  "Life Protection",
  "Wealth Accumulation",
  "Legacy Planning",
  "PRUVantage Assure Series",
  "PRUVantage Wealth III",
  "PRUVantage Wealth II",
  "PRUVantage Prosper",
  "PRUUnited Wealth",
  "PRULink InvestGrowth",
  "PRUActive LinkGuard",
  RELATED_PRODUCT_FALLBACK,
];

function normalizeRelatedProduct(relatedProduct = "", question = "") {
  const combinedText = `${relatedProduct} ${question}`.toLowerCase();

  const directMatch = RELATED_PRODUCT_LABELS.find((label) =>
    combinedText.includes(label.toLowerCase()),
  );

  if (directMatch) {
    return directMatch;
  }

  if (
    combinedText.includes("health") ||
    combinedText.includes("medical") ||
    combinedText.includes("hospital")
  ) {
    return "Health Protection";
  }

  if (
    combinedText.includes("life") ||
    combinedText.includes("family") ||
    combinedText.includes("protection")
  ) {
    return "Life Protection";
  }

  if (
    combinedText.includes("wealth") ||
    combinedText.includes("invest") ||
    combinedText.includes("growth") ||
    combinedText.includes("savings")
  ) {
    return "Wealth Accumulation";
  }

  if (
    combinedText.includes("legacy") ||
    combinedText.includes("estate") ||
    combinedText.includes("retirement")
  ) {
    return "Legacy Planning";
  }

  return RELATED_PRODUCT_FALLBACK;
}

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

  if (MISSING_INFO_FIELD_ALIASES[normalized]) {
    return normalized;
  }

  const readable = normalized.replace(/_/g, " ");

  return (
    Object.entries(MISSING_INFO_FIELD_ALIASES).find(([, aliases]) =>
      aliases.some((alias) => readable.includes(alias))
    )?.[0] || "general"
  );
}

function detectConcernTags(question) {
  const text = question.toLowerCase();
  const tags = [];

  if (
    text.includes("guaranteed") ||
    text.includes("guarantee") ||
    text.includes("return")
  ) {
    tags.push("Guaranteed returns");
  }

  if (
    text.includes("risk") ||
    text.includes("loss") ||
    text.includes("market")
  ) {
    tags.push("Investment risk");
  }

  if (
    text.includes("premium") ||
    text.includes("stop paying") ||
    text.includes("lapse")
  ) {
    tags.push("Premium commitment");
  }

  if (
    text.includes("charge") ||
    text.includes("fee") ||
    text.includes("cost")
  ) {
    tags.push("Charges and fees");
  }

  if (
    text.includes("afford") ||
    text.includes("income") ||
    text.includes("salary")
  ) {
    tags.push("Affordability");
  }

  if (
    text.includes("surrender") ||
    text.includes("withdraw") ||
    text.includes("cancel")
  ) {
    tags.push("Surrender or withdrawal");
  }

  return [...new Set(tags)];
}

router.post("/ask", async (req, res) => {
  try {
    const { customer_id, question, explanation_mode } = req.body || {};
    const cleanQuestion = String(question || "").trim();
    const cleanExplanationMode = ALLOWED_EXPLANATION_MODES.has(explanation_mode)
      ? explanation_mode
      : "simple";

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: "customer_id is required",
      });
    }

    if (!cleanQuestion) {
      return res.status(400).json({
        success: false,
        message: "Please enter a question for Clarity.",
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

    const [historyRows] = await pool.execute(
      `SELECT role, message
       FROM chatmessage
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT 8`,
      [customer_id],
    );

    const chatHistory = historyRows
      .reverse()
      .map((msg) => `${msg.role}: ${msg.message}`)
      .join("\n");

    const aiResult = await askInsuranceAI({
      customer,
      question: cleanQuestion,
      chatHistory,
      documentContext: prudentialKnowledgeText,
      explanationMode: cleanExplanationMode,
    });
    const relatedProduct = normalizeRelatedProduct(
      aiResult.related_product,
      cleanQuestion,
    );

    await pool.execute(
      `INSERT INTO chatmessage
       (customer_id, role, message)
       VALUES (?, ?, ?)`,
      [customer_id, "user", cleanQuestion],
    );

    await pool.execute(
      `INSERT INTO chatmessage
       (customer_id, role, message)
       VALUES (?, ?, ?)`,
      [customer_id, "assistant", aiResult.answer],
    );

    await pool.execute(
      `INSERT INTO questionlog
       (customer_id, question, related_product, needs_advisor_clarification)
       VALUES (?, ?, ?, ?)`,
      [
        customer_id,
        cleanQuestion,
        relatedProduct,
        aiResult.needs_advisor_clarification ? 1 : 0,
      ],
    );

    const concernTags = detectConcernTags(cleanQuestion);

    for (const tag of concernTags) {
      await pool.execute(
        `INSERT INTO customertag
         (customer_id, tag_name, source_question)
         VALUES (?, ?, ?)`,
        [customer_id, tag, cleanQuestion],
      );
    }

    if (
      aiResult.missing_customer_info &&
      aiResult.missing_customer_info.length > 0
    ) {
      for (const item of aiResult.missing_customer_info) {
        try {
          const questionText = normalizeMissingInfoQuestion(item.question);
          const fieldName = normalizeMissingInfoField(
            item.field_name,
            questionText,
          );

          const [existingRows] = await pool.execute(
            `SELECT missing_id
             FROM missinginfo
             WHERE customer_id = ?
               AND field_name = ?
               AND is_answered = FALSE
             LIMIT 1`,
            [customer_id, fieldName],
          );

          if (existingRows.length === 0) {
            await pool.execute(
              `INSERT INTO missinginfo (customer_id, field_name, question, is_answered)
               VALUES (?, ?, ?, ?)`,
              [customer_id, fieldName, questionText, 0],
            );
          }
        } catch (insertError) {
          console.error("Missing info insert error:", insertError);
        }
      }
    }

    res.json({
      success: true,
      answer: aiResult.answer,
      source_note:
        aiResult.source_note ||
        "Based on the PRUPath Product Knowledge Document.",
      related_product: relatedProduct,
      product_shortlist: aiResult.product_shortlist || [],
      missing_customer_info: (aiResult.missing_customer_info || []).map((item) => ({
        ...item,
        question: normalizeMissingInfoQuestion(item.question),
      })),
      next_best_questions: aiResult.next_best_questions || [
        "What is your main goal: protection, wealth growth, income, or legacy planning?",
        "What is your preferred monthly premium budget for this investment-linked plan?",
        "How comfortable are you with investment values going up and down?",
      ],
      needs_advisor_clarification: aiResult.needs_advisor_clarification ?? true,
      clarification_topic:
        aiResult.clarification_topic ||
        "Advisor should clarify this during the meeting.",
      advisor_note:
        aiResult.advisor_note ||
        "Advisor should confirm suitability, affordability, risks, charges, and policy terms.",
      concern_tags: concernTags,
    });
  } catch (error) {
    console.error("AI chat error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate AI answer",
      error: error.message,
    });
  }
});

router.get("/:customerId", async (req, res) => {
  try {
    const customerId = req.params.customerId;

    const [rows] = await pool.execute(
      `SELECT *
       FROM chatmessage
       WHERE customer_id = ?
       ORDER BY created_at ASC`,
      [customerId],
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get chat history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get chat history",
      error: error.message,
    });
  }
});

export default router;
