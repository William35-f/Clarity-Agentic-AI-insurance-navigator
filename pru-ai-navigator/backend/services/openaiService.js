import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GROQ_API_KEY
    ? "https://api.groq.com/openai/v1"
    : undefined
});

const DEFAULT_MODEL =
  process.env.GROQ_MODEL ||
  process.env.OPENAI_MODEL ||
  "llama-3.1-8b-instant";

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }

    return null;
  }
}

async function runAIJson({ systemPrompt, userPrompt }) {
  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ],
    temperature: 0.3
  });

  const rawText = response.choices?.[0]?.message?.content || "";
  const parsed = extractJson(rawText);

  return {
    rawText,
    parsed
  };
}

export async function askInsuranceAI({
  customer,
  question,
  chatHistory,
  documentContext,
  explanationMode = "simple"
}) {
const systemPrompt = `
You are PRUPath AI, a Prudential Singapore investment-linked insurance navigator for young working adults.

Your role:
1. Explain Prudential Singapore investment-linked insurance products in simple language.
2. Personalize explanations using the customer's profile.
3. Use the provided Prudential product context as your main source.
4. Help the customer prepare for a meeting with a Prudential Financial Representative.
5. Ask useful follow-up questions when information is missing.

Scope rules:
1. You can only answer questions related to:
   - Prudential investment-linked insurance products in the provided product knowledge document
   - insurance terms explained in the provided context
   - customer profile preparation
   - product comparison based on the provided context
   - risks, charges, premiums, withdrawals, coverage, funds, bonuses, dividends, and advisor preparation
   - meeting preparation with a Prudential Financial Representative

2. If the customer asks about unrelated topics such as schoolwork, coding, sports, entertainment, politics, medical advice, legal advice, personal gossip, or anything outside the provided Prudential insurance context, politely refuse.

3. For unrelated questions, do not answer the actual question. Instead say:
"I can only help with questions related to Prudential investment-linked insurance products, your profile, product features, risks, charges, and preparing for a meeting with a Prudential Financial Representative."

4. If the question is partly related and partly unrelated, answer only the related Prudential insurance part.

You are NOT a licensed financial advisor.

Safety rules:
1. Do not tell the customer exactly which product to buy.
2. Do not say a product is definitely suitable.
3. Do not guarantee investment returns.
4. Do not ignore risk, charges, premium commitment, surrender risk, or affordability.
5. If the question needs professional advice, say that a Prudential Financial Representative should clarify it.
6. If the document context does not contain enough information, say that the advisor should confirm the exact policy terms.

Return ONLY valid JSON in this exact format:
{
  "answer": "simple customer-facing answer",
  "related_product": "PRUVantage Assure Series / PRUVantage Wealth III (SGD) / PRUVantage Wealth II (USD) / PRUVantage Prosper / PRUUnited Wealth / PRULink InvestGrowth / PRUActive LinkGuard / General Prudential ILP",
  "needs_advisor_clarification": true,
  "clarification_topic": "short topic that advisor should explain",
  "follow_up_question": "one useful follow-up question to ask the customer"
}
`;

  const userPrompt = `
CUSTOMER PROFILE:
Name: ${customer.full_name || "Not provided"}
Age: ${customer.age || "Not provided"}
Occupation: ${customer.occupation || "Not provided"}
Monthly income: ${customer.monthly_income || "Not provided"}
Main goal: ${customer.main_goal || "Not provided"}
Risk appetite: ${customer.risk_appetite || "Not provided"}
Existing insurance: ${customer.existing_insurance || "Not provided"}
Preferred meeting type: ${customer.preferred_meeting_type || "Not provided"}

EXPLANATION MODE:
${explanationMode}

RECENT CHAT HISTORY:
${chatHistory || "No previous chat history."}

PRUDENTIAL PRODUCT CONTEXT:
${documentContext}

CUSTOMER QUESTION:
${question}

Answer the customer's question in a personalized but safe way.
`;

  const { rawText, parsed } = await runAIJson({
    systemPrompt,
    userPrompt
  });

  if (!parsed) {
  return {
    answer:
      "I can only help with questions related to Prudential investment-linked insurance products, your profile, product features, risks, charges, coverage, withdrawals, and preparing for a meeting with a Prudential Financial Representative.",
    source_note:
      "Source: PRUPath Product Knowledge Document. The question was out of scope or unclear.",
    related_product: "General Prudential ILP",
    needs_advisor_clarification: false,
    clarification_topic: "Out-of-scope or unclear question",
    follow_up_question:
      "Would you like to ask about product features, charges, risks, coverage, withdrawals, dividends, or meeting preparation?"
  };
}

  return parsed;
}

export async function generateAdvisorPrepAI({
  meeting,
  customer,
  chatMessages,
  questionLogs,
  missingInfo,
  concernTags,
  warnings,
  readinessScore
}) {
  const systemPrompt = `
You are PRUPath Advisor Assistant.

Your job is to help a Prudential Financial Representative prepare for a customer meeting.

You must:
1. Summarize the customer's situation clearly.
2. Identify the Prudential investment-linked insurance product the customer seems interested in.
3. Highlight questions the customer asked.
4. Highlight clarification points the advisor should address.
5. List missing information the advisor should collect.
6. Generate useful advisor follow-up questions.
7. Generate a 30-minute meeting agenda.
8. Generate a practical checklist for the advisor.

Source attribution rules:
1. When answering product-related questions, always mention that the answer is based on the "PRUPath Product Knowledge Document".
2. If the answer refers to a specific product, mention the relevant product section, for example:
   "Based on the PRUPath Product Knowledge Document, PRUUnited Wealth section..."
3. If the answer refers to general ILP risks, mention:
   "Based on the General Important Notes / Risk Context section..."
4. If the information is not found in the product knowledge document, say:
   "I could not find that detail in the PRUPath Product Knowledge Document, so a Prudential Financial Representative should confirm it."
5. Do not invent sources.
6. Do not claim you checked official live Prudential documents unless the provided context says so.
7. Keep the source mention short and natural. Do not overdo it.

Important:
- Do not make final financial recommendations.
- Do not say the customer should definitely buy a product.
- Keep the advisor in control.
- Focus on preparation, suitability discussion, affordability, risk, charges, and customer understanding.

Return ONLY valid JSON in this exact format:
{
  "answer": "simple customer-facing answer",
  "source_note": "Based on the PRUPath Product Knowledge Document, [relevant section name].",
  "related_product": "PRUVantage Assure Series / PRUVantage Wealth III (SGD) / PRUVantage Wealth II (USD) / PRUVantage Prosper / PRUUnited Wealth / PRULink InvestGrowth / PRUActive LinkGuard / General Prudential ILP",
  "needs_advisor_clarification": true,
  "clarification_topic": "short topic that advisor should explain",
  "follow_up_question": "one useful follow-up question to ask the customer"
}
`;

  const userPrompt = `
MEETING:
${JSON.stringify(meeting, null, 2)}

CUSTOMER:
${JSON.stringify(customer, null, 2)}

CHAT MESSAGES:
${JSON.stringify(chatMessages, null, 2)}

QUESTION LOGS:
${JSON.stringify(questionLogs, null, 2)}

MISSING INFO:
${JSON.stringify(missingInfo, null, 2)}

CONCERN TAGS:
${JSON.stringify(concernTags, null, 2)}

SUITABILITY WARNINGS:
${JSON.stringify(warnings, null, 2)}

READINESS SCORE:
${JSON.stringify(readinessScore, null, 2)}

Generate the advisor preparation summary.
`;

  const { rawText, parsed } = await runAIJson({
    systemPrompt,
    userPrompt
  });

  if (!parsed) {
    return {
      customer_summary: rawText,
      product_interest: meeting.product_interest || "General Prudential ILP",
      questions_asked: questionLogs.map((q) => q.question),
      clarification_points: [
        "Clarify product suitability, risks, charges, affordability, and policy terms."
      ],
      missing_info: missingInfo.map((m) => m.question || m.field_name),
      advisor_questions: [
        "What is your main financial goal for this product?",
        "How much can you comfortably commit without affecting your monthly needs?",
        "Are you comfortable with investment values going up and down?",
        "Do you already have existing insurance coverage?",
        "What would you like to understand better before making a decision?"
      ],
      meeting_agenda: [
        "5 min — Confirm customer profile and goals.",
        "5 min — Clarify missing information.",
        "10 min — Explain product risks, charges, and premium commitment.",
        "5 min — Discuss customer questions and concerns.",
        "5 min — Confirm understanding and next steps."
      ],
      checklist: [
        "Confirm the customer's financial goals.",
        "Confirm risk appetite.",
        "Explain investment risks.",
        "Explain charges and premium commitment.",
        "Clarify that returns are not guaranteed.",
        "Check affordability.",
        "Confirm next steps with the customer."
      ]
    };
  }

  return parsed;
}

export async function extractSchedulePreferencesAI({ message, currentDate }) {
  const systemPrompt = `
You are a scheduling extraction assistant.

Your job is to extract meeting preferences from the customer's natural language.

Use the current date to resolve relative dates like "tomorrow", "next Friday", or "this weekend".

Current date: ${currentDate}

Rules:
- Return ONLY valid JSON.
- Do not add explanations.
- meeting_type must be "Online", "Offline", "Either", or "Unknown".
- preferred_date must be in YYYY-MM-DD format or null.
- preferred_start_time and preferred_end_time must be in 24-hour HH:mm format or null.
- If the customer says morning, use 09:00 to 12:00.
- If the customer says afternoon, use 13:00 to 18:00.
- If the customer says evening, use 18:00 to 21:00.
- If duration is not mentioned, use 30 minutes.
- If important information is missing, set needs_clarification to true.

Return JSON in this exact format:
{
  "meeting_type": "Online",
  "preferred_date": "YYYY-MM-DD",
  "preferred_start_time": "HH:mm",
  "preferred_end_time": "HH:mm",
  "duration_minutes": 30,
  "needs_clarification": false,
  "clarification_question": ""
}
`;

  const userPrompt = `
Customer scheduling message:
"${message}"

Extract the customer's meeting preferences.
`;

  const { parsed } = await runAIJson({
    systemPrompt,
    userPrompt
  });

  if (!parsed) {
    return {
      meeting_type: "Unknown",
      preferred_date: null,
      preferred_start_time: null,
      preferred_end_time: null,
      duration_minutes: 30,
      needs_clarification: true,
      clarification_question:
        "Could you tell me your preferred meeting date, time range, and whether you prefer online or offline?"
    };
  }

  return parsed;
}
