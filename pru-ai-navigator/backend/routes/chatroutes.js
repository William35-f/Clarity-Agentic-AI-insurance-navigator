import express from "express";
import pool from "../db.js";
import { askInsuranceAI } from "../services/openaiService.js";
import { prudentialKnowledgeText } from "../data/prudentialKnowledgeText.js";

const router = express.Router();

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

    if (!customer_id || !question) {
      return res.status(400).json({
        success: false,
        message: "customer_id and question are required"
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

    const [historyRows] = await pool.execute(
      `SELECT role, message
       FROM chatmessage
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT 8`,
      [customer_id]
    );

    const chatHistory = historyRows
      .reverse()
      .map((msg) => `${msg.role}: ${msg.message}`)
      .join("\n");

    const aiResult = await askInsuranceAI({
      customer,
      question,
      chatHistory,
      documentContext: prudentialKnowledgeText,
      explanationMode: explanation_mode || "simple"
    });

    await pool.execute(
      `INSERT INTO chatmessage
       (customer_id, role, message)
       VALUES (?, ?, ?)`,
      [customer_id, "user", question]
    );

    await pool.execute(
      `INSERT INTO chatmessage
       (customer_id, role, message)
       VALUES (?, ?, ?)`,
      [customer_id, "assistant", aiResult.answer]
    );

    await pool.execute(
      `INSERT INTO questionlog
       (customer_id, question, related_product, needs_advisor_clarification)
       VALUES (?, ?, ?, ?)`,
      [
        customer_id,
        question,
        aiResult.related_product || "General Prudential ILP",
        aiResult.needs_advisor_clarification ? 1 : 0
      ]
    );

    const concernTags = detectConcernTags(question);

    for (const tag of concernTags) {
      await pool.execute(
        `INSERT INTO customertag
         (customer_id, tag_name, source_question)
         VALUES (?, ?, ?)`,
        [customer_id, tag, question]
      );
    }

    res.json({
      success: true,
      answer: aiResult.answer,
      source_note:
        aiResult.source_note ||
        "Based on the PRUPath Product Knowledge Document.",
      related_product: aiResult.related_product || "General Prudential ILP",
      needs_advisor_clarification:
        aiResult.needs_advisor_clarification ?? true,
      clarification_topic:
        aiResult.clarification_topic ||
        "Advisor should clarify this during the meeting.",
      follow_up_question:
        aiResult.follow_up_question ||
        "Would you like to ask the advisor about risks, charges, and suitability?",
      concern_tags: concernTags
    });
  } catch (error) {
    console.error("AI chat error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate AI answer",
      error: error.message
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
      [customerId]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error("Get chat history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get chat history",
      error: error.message
    });
  }
});

export default router;