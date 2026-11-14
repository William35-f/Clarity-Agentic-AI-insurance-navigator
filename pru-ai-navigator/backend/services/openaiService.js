import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

let openaiClient = null;

function getOpenAIClient() {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey,
      baseURL: process.env.GROQ_API_KEY
        ? "https://api.groq.com/openai/v1"
        : undefined,
    });
  }

  return openaiClient;
}

const DEFAULT_MODEL =
  process.env.GROQ_MODEL || process.env.OPENAI_MODEL || "llama-3.1-8b-instant";

const DEFAULT_NEXT_BEST_QUESTIONS = [
  "What is your main goal: protection, wealth growth, income, or legacy planning?",
  "What is your preferred monthly premium budget for this investment-linked plan?",
  "How comfortable are you with investment values going up and down?",
];

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
  const openai = getOpenAIClient();

  if (!openai) {
    console.warn(
      "AI provider API key is not configured. Returning deterministic fallback."
    );

    return {
      rawText: "",
      parsed: null,
    };
  }

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const rawText = response.choices?.[0]?.message?.content || "";
  const parsed = extractJson(rawText);

  return {
    rawText,
    parsed,
  };
}

export async function askInsuranceAI({
  customer,
  question,
  chatHistory,
  documentContext,
  explanationMode = "simple",
}) {
  const systemPrompt = `
You are Clarity, an agentic Prudential Singapore insurance interviewer for customer meeting preparation.

Your role:
1. Explain Prudential insurance coverage, protection needs, wealth planning, product categories, and policy concepts in simple language.
2. Personalize explanations using the customer's profile.
3. Use the provided Prudential product context as your main source.
4. Help the customer prepare for a meeting with a Prudential Financial Representative.
5. Ask useful follow-up questions when information is missing.
6. Save or highlight useful concerns, questions, and missing information for the Financial Representative.
7. Map customer concerns to Health Protection, Life Protection, Wealth Accumulation, and Legacy Planning where possible.
8. Reduce the Financial Representative's burden by collecting practical missing information from the customer before the meeting.

Scope rules:
1. You can only answer questions related to:
   - Prudential insurance coverage and product categories
   - Health Protection, Life Protection, Wealth Accumulation, and Legacy Planning
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
It does not replace a Prudential Financial Representative and does not give final financial advice.

Safety rules:
1. Do not tell the customer exactly which product to buy.
2. Do not say a product is definitely suitable or the best product to buy.
3. Do not guarantee investment returns.
4. Do not ignore risk, charges, premium commitment, surrender risk, or affordability.
5. If the question needs professional advice, say that a Prudential Financial Representative should clarify it.
6. If the document context does not contain enough information, say that the advisor should confirm the exact policy terms.
7. Frame answers as preparation for a discussion with a Prudential Financial Representative.

Product narrowing rules:
1. Do not only answer the customer's question. After answering, help the customer narrow down which Prudential products may be relevant to discuss with a Prudential Financial Representative.
2. Never say a product is definitely suitable or the best product to buy.
3. Use phrases like: "may be relevant to discuss", "could be worth asking the advisor about", and "based on your stated goal, this product appears more aligned, but suitability must be confirmed by an advisor".
4. Narrow products based on: main financial goal, risk appetite, monthly income/affordability, preferred currency, need for protection, desire for monthly income or dividends, long-term wealth growth, premium payment preference, and comfort with non-guaranteed returns.
5. If important information is missing, ask targeted follow-up questions before narrowing too strongly.
6. Ask no more than 3 follow-up questions at a time.
7. Prioritize questions that help determine suitability, affordability, risk tolerance, and product direction.
8. If the customer asks "which product is suitable for me", do not give a final recommendation. Instead, provide a shortlist of products to discuss and explain what information is still needed.
9. When asking about premium budget, ask only for the monthly premium budget. Do not ask for annual premium budget.

Product direction guide:
- If the customer mainly wants protection, death coverage, terminal illness, total permanent disability, or critical illness discussion, PRUActive LinkGuard may be relevant to discuss.
- If the customer wants investment-linked wealth growth with stronger Wealth Assure-style protection features, PRUVantage Assure Series may be relevant to discuss.
- If the customer wants SGD-based long-term wealth planning, income potential, legacy planning, and access to PRUPrime CIO Funds, PRUVantage Wealth III (SGD) may be relevant to discuss.
- If the customer specifically wants USD exposure or USD-denominated wealth planning, PRUVantage Wealth II (USD) may be relevant to discuss.
- If the customer wants long-term wealth, possible dividends, Growth/Flex account planning, and legacy planning, PRUVantage Prosper may be relevant to discuss.
- If the customer wants income, growth, protection, wealth continuity, and a shorter 5-year or 10-year premium term, PRUUnited Wealth may be relevant to discuss.
- If the customer wants flexible investment-linked wealth growth with cash, CPF, or SRS funding, PRULink InvestGrowth may be relevant to discuss.
- If the customer is unsure, ask about goal, premium budget, currency preference, protection need, risk appetite, and whether they want income or growth.

Follow-up question priority:
1. If main goal is missing, ask about goal.
2. If premium budget or income is missing, ask about monthly affordability.
3. If risk appetite is missing, ask about risk comfort.
4. If product direction is unclear, ask income vs growth vs protection.
5. If currency matters, ask SGD vs USD.
6. If protection need is unclear, ask about existing insurance.
7. If the customer is close to booking, ask what they want the advisor to explain first.
8. The next_best_questions are questions Clarity should ask the customer directly during the interview, not generic suggestions.
9. Ask the most important next question first so the customer can answer it in the chat input. The customer may also ask a different question instead.

Return ONLY valid JSON in this exact format:
{
  "answer": "simple customer-facing answer",
  "source_note": "Based on the PRUPath Product Knowledge Document, relevant section name.",
  "related_product": "one short label only: Health Protection, Life Protection, Wealth Accumulation, Legacy Planning, PRUVantage Assure Series, PRUVantage Wealth III, PRUVantage Wealth II, PRUVantage Prosper, PRUUnited Wealth, PRULink InvestGrowth, PRUActive LinkGuard, or General Prudential ILP",
  "product_shortlist": [
    {
      "product_name": "product name",
      "relevance_score": 0,
      "why_it_may_be_relevant": "short reason",
      "what_to_clarify": "what advisor should confirm"
    }
  ],
  "missing_customer_info": [
    {
      "field_name": "field name",
      "question": "question to ask customer"
    }
  ],
  "next_best_questions": [
    "question 1",
    "question 2",
    "question 3"
  ],
  "needs_advisor_clarification": true,
  "clarification_topic": "short topic that advisor should explain",
  "advisor_note": "short note for advisor"
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
    userPrompt,
  });

  const defaultResult = {
    answer:
      "I can only help with questions related to Prudential investment-linked insurance products, your profile, product features, risks, charges, coverage, withdrawals, and preparing for a meeting with a Prudential Financial Representative.",
    source_note:
      "Based on the PRUPath Product Knowledge Document, the question was out of scope or unclear.",
    related_product: "General Prudential ILP",
    product_shortlist: [],
    missing_customer_info: [],
    next_best_questions: DEFAULT_NEXT_BEST_QUESTIONS,
    needs_advisor_clarification: false,
    clarification_topic: "Out-of-scope or unclear question",
    advisor_note:
      "Advisor should confirm suitability, affordability, risks, charges, and policy terms.",
  };

  if (!parsed) {
    return defaultResult;
  }

  return {
    ...defaultResult,
    ...parsed,
    product_shortlist: parsed.product_shortlist || [],
    missing_customer_info: parsed.missing_customer_info || [],
    next_best_questions:
      parsed.next_best_questions || DEFAULT_NEXT_BEST_QUESTIONS,
  };
}

export async function generateAdvisorPrepAI({
  meeting,
  customer,
  chatMessages,
  questionLogs,
  missingInfo,
  concernTags,
  warnings,
  readinessScore,
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
  "customer_summary": "short advisor-facing summary of customer profile, goals, concerns, and meeting context",
  "product_interest": "detected product interest",
  "questions_asked": [
    "customer question from the Clarity conversation"
  ],
  "clarification_points": [
    "specific point the advisor should clarify"
  ],
  "missing_info": [
    "missing or recently completed customer information to confirm"
  ],
  "advisor_questions": [
    "question the advisor can ask during the meeting"
  ],
  "meeting_agenda": [
    "timed agenda item"
  ],
  "checklist": [
    "practical advisor checklist item"
  ]
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
    userPrompt,
  });

  if (!parsed) {
    return {
      customer_summary: rawText,
      product_interest: meeting.product_interest || "General Prudential ILP",
      questions_asked: questionLogs.map((q) => q.question),
      clarification_points: [
        "Clarify product suitability, risks, charges, affordability, and policy terms.",
      ],
      missing_info: missingInfo.map((m) => m.question || m.field_name),
      advisor_questions: [
        "What is your main financial goal for this product?",
        "How much can you comfortably commit without affecting your monthly needs?",
        "Are you comfortable with investment values going up and down?",
        "Do you already have existing insurance coverage?",
        "What would you like to understand better before making a decision?",
      ],
      meeting_agenda: [
        "5 min — Confirm customer profile and goals.",
        "5 min — Clarify missing information.",
        "10 min — Explain product risks, charges, and premium commitment.",
        "5 min — Discuss customer questions and concerns.",
        "5 min — Confirm understanding and next steps.",
      ],
      checklist: [
        "Confirm the customer's financial goals.",
        "Confirm risk appetite.",
        "Explain investment risks.",
        "Explain charges and premium commitment.",
        "Clarify that returns are not guaranteed.",
        "Check affordability.",
        "Confirm next steps with the customer.",
      ],
    };
  }

  return parsed;
}

export async function generateAdvisorMeetingAssistantAI({
  customer,
  meeting,
  advisorSummary,
  chatMessages,
  questionLogs,
  missingInfo,
  currentMeetingNotes,
  message,
}) {
  const fallback = {
    reply:
      "I can support the Financial Representative by explaining concepts, identifying missing information, and drafting discussion notes. The representative should confirm the customer's needs before making any recommendation.",
    suggested_questions: [
      "What outcome matters most to you: protection, wealth growth, income, or legacy planning?",
      "What monthly commitment would feel comfortable after your essential expenses?",
      "What existing coverage do you already have, and where do you feel exposed?",
    ],
    missing_information: (missingInfo || [])
      .map((item) => item.question || item.field_name)
      .filter(Boolean),
    meeting_notes_update:
      "Discussion note: Advisor should confirm customer goals, affordability, risk comfort, existing coverage, and next steps before discussing any specific product.",
  };

  const systemPrompt = `
You are Clarity, an advisor-side AI copilot for Prudential Financial Representatives.

Your role is to help the representative explain insurance concepts, clarify customer concerns, identify missing information, compare broad Prudential product categories, and draft meeting notes.

You do not replace the representative, you do not make final financial recommendations, and you do not guarantee returns or outcomes. Use the available customer profile and meeting context. If information is missing, suggest what the representative should clarify.

You may map discussion to broad product categories only:
- Health Protection
- Life Protection
- Wealth Accumulation
- Legacy Planning

Return ONLY valid JSON in this exact format:
{
  "reply": "advisor-facing response",
  "suggested_questions": ["question"],
  "missing_information": ["missing item"],
  "meeting_notes_update": "notes to append"
}

`;

  const userPrompt = `
CUSTOMER:
${JSON.stringify(customer || null, null, 2)}

MEETING:
${JSON.stringify(meeting || null, null, 2)}

ADVISOR SUMMARY:
${JSON.stringify(advisorSummary || null, null, 2)}

CUSTOMER CHAT MESSAGES:
${JSON.stringify(chatMessages || [], null, 2)}

QUESTION LOGS:
${JSON.stringify(questionLogs || [], null, 2)}

MISSING INFORMATION:
${JSON.stringify(missingInfo || [], null, 2)}

CURRENT MEETING NOTES:
${currentMeetingNotes || "No notes yet."}

ADVISOR MESSAGE:
${message}
`;

  try {
    const { rawText, parsed } = await runAIJson({
      systemPrompt,
      userPrompt,
    });

    if (!parsed) {
      return {
        ...fallback,
        reply: rawText || fallback.reply,
      };
    }

    return {
      reply: String(parsed.reply || fallback.reply).trim(),
      suggested_questions: Array.isArray(parsed.suggested_questions)
        ? parsed.suggested_questions.filter(Boolean)
        : fallback.suggested_questions,
      missing_information: Array.isArray(parsed.missing_information)
        ? parsed.missing_information.filter(Boolean)
        : fallback.missing_information,
      meeting_notes_update: String(
        parsed.meeting_notes_update || fallback.meeting_notes_update,
      ).trim(),
    };
  } catch (error) {
    console.error("Advisor meeting assistant AI fallback:", error);
    return fallback;
  }
}

export async function analyzeMeetingStatementAI({ statement, customer, meeting }) {
  const text = String(statement || "").trim();
  const misunderstandingPattern =
    /guaranteed|fully covered|cover everything|every type|automatically covered|no risk|cannot lose|all expenses/i;
  const detectedByRule = misunderstandingPattern.test(text);
  const fallback = {
    misunderstanding_detected: detectedByRule,
    issue: detectedByRule
      ? "The customer may be treating a conditional product feature or outcome as guaranteed."
      : "",
    advisor_action: detectedByRule
      ? "Pause and confirm the customer's understanding. Explain the relevant conditions, exclusions, risks, charges, or non-guaranteed elements before continuing."
      : "",
    advisor_conduct_reminder: detectedByRule
      ? "Keep the explanation balanced, verify the customer's understanding, disclose important limitations, and avoid presenting conditional benefits or outcomes as guaranteed."
      : "",
    source: detectedByRule
      ? "PRUPath Product Knowledge Document — relevant product section and General Important Notes"
      : "",
    severity: detectedByRule ? "High" : "None",
  };

  const systemPrompt = `
You are Clarity, an advisor-side consultation cue assistant.
Analyze one customer statement for a possible misunderstanding about insurance coverage, guarantees, investment returns, exclusions, charges, premiums, withdrawals, or suitability.
Do not make a product recommendation. Only flag a statement when clarification is genuinely useful.

Return ONLY valid JSON:
{
  "misunderstanding_detected": true,
  "issue": "short description",
  "advisor_action": "specific safe clarification action",
  "advisor_conduct_reminder": "practical reminder to support a clear, balanced and customer-focused explanation",
  "source": "PRUPath Product Knowledge Document — relevant section",
  "severity": "High, Medium, Low, or None"
}

`;
  const userPrompt = `
CUSTOMER PROFILE:
${JSON.stringify(customer || null, null, 2)}

MEETING:
${JSON.stringify(meeting || null, null, 2)}

CUSTOMER STATEMENT:
${text}
`;

  try {
    const { parsed } = await runAIJson({ systemPrompt, userPrompt });
    if (!parsed) return fallback;

    return {
      misunderstanding_detected: Boolean(parsed.misunderstanding_detected),
      issue: String(parsed.issue || "").trim(),
      advisor_action: String(parsed.advisor_action || "").trim(),
      advisor_conduct_reminder: String(
        parsed.advisor_conduct_reminder || fallback.advisor_conduct_reminder
      ).trim(),
      source: String(parsed.source || fallback.source).trim(),
      severity: String(parsed.severity || "None").trim(),
    };
  } catch (error) {
    console.error("Meeting statement analysis fallback:", error);
    return fallback;
  }
}

export async function generatePostMeetingRecordAI({
  customer,
  meeting,
  transcript,
  notes,
  checklist,
}) {
  const unresolved = (checklist || []).filter((item) => !item.completed);
  const fallback = {
    summary: `${customer?.full_name || "The customer"} completed a consultation about ${meeting?.product_interest || "insurance needs"}. The advisor reviewed the customer's goals, existing coverage, affordability, risk comfort, important limitations, and next steps.`,
    follow_up_tasks: unresolved.map((item) => ({
      task: `Follow up on unresolved checklist item: ${item.text}`,
      owner: "Advisor",
      completed: false,
    })),
  };

  const systemPrompt = `
You are Clarity, an advisor-side meeting documentation assistant.
Create a concise factual post-meeting summary and practical follow-up tasks from the supplied transcript, notes, and checklist.
Do not invent decisions, recommendations, consent, or completed actions. Unresolved checklist items must become follow-up tasks. Keep the advisor in control.

Return ONLY valid JSON:
{
  "summary": "concise factual meeting summary",
  "follow_up_tasks": [
    { "task": "specific action", "owner": "Advisor or Customer", "completed": false }
  ]
}
`;
  const userPrompt = `
CUSTOMER:
${JSON.stringify(customer || null, null, 2)}

MEETING:
${JSON.stringify(meeting || null, null, 2)}

TRANSCRIPT:
${JSON.stringify(transcript || [], null, 2)}

MEETING NOTES:
${JSON.stringify(notes || [], null, 2)}

CHECKLIST OUTCOMES:
${JSON.stringify(checklist || [], null, 2)}
`;

  try {
    const { parsed } = await runAIJson({ systemPrompt, userPrompt });
    if (!parsed) return fallback;
    return {
      summary: String(parsed.summary || fallback.summary).trim(),
      follow_up_tasks: Array.isArray(parsed.follow_up_tasks)
        ? parsed.follow_up_tasks
            .map((item) => ({
              task: String(item?.task || "").trim(),
              owner: item?.owner === "Customer" ? "Customer" : "Advisor",
              completed: Boolean(item?.completed),
            }))
            .filter((item) => item.task)
        : fallback.follow_up_tasks,
    };
  } catch (error) {
    console.error("Post-meeting record AI fallback:", error);
    return fallback;
  }
}

export async function generateCustomerFollowUpAI({ customer, advisor, meeting, task, summary }) {
  const fallback = {
    subject: `Follow-up from your consultation with ${advisor?.full_name || "your advisor"}`,
    body: `Hi ${customer?.full_name || "there"},\n\nThank you for meeting with us about ${meeting?.product_interest || "your insurance planning needs"}. As discussed, the next action is: ${task}.\n\nPlease reply through Clarity if you have any questions. Product suitability and final policy terms should be confirmed with your Financial Representative.\n\nRegards,\n${advisor?.full_name || "Your Financial Representative"}`,
  };

  const systemPrompt = `
You are Clarity's Follow-up Agent for an insurance consultation.
Draft a concise, warm customer follow-up message from an approved completed-meeting record.
State the requested next action clearly. Do not invent commitments, recommendations, deadlines, attachments, or policy terms.
Do not guarantee returns or imply that a product is suitable. The message must remain subject to advisor review.
Return ONLY valid JSON: { "subject": "...", "body": "..." }
`;
  const userPrompt = `
CUSTOMER: ${JSON.stringify(customer || null, null, 2)}
ADVISOR: ${JSON.stringify(advisor || null, null, 2)}
MEETING: ${JSON.stringify(meeting || null, null, 2)}
APPROVED SUMMARY: ${summary || ""}
FOLLOW-UP ACTION: ${task || ""}
`;

  try {
    const { parsed } = await runAIJson({ systemPrompt, userPrompt });
    if (!parsed) return fallback;
    return {
      subject: String(parsed.subject || fallback.subject).trim(),
      body: String(parsed.body || fallback.body).trim(),
    };
  } catch (error) {
    console.error("Customer follow-up AI fallback:", error);
    return fallback;
  }
}

export async function selectMeetingSlotAI({
  availabilityText,
  customer,
  productInterest,
  candidateSlots,
}) {
  const systemPrompt = `
You are Clarity, an AI meeting scheduling assistant for an insurance navigator prototype.
Your job is to interpret the customer's natural language availability and choose the most suitable advisor slot from the real candidate slots provided by the backend.
You must only choose from the provided slot IDs. Do not invent dates, times, advisors, or slot IDs.
Consider meeting type, time-of-day preference, product interest, advisor specialisation, and earliest availability within the next 7 days.
If meeting type is missing, use the customer profile preference if provided.
If both user text and profile preference are missing, return meeting_type as unclear and do not select a slot.
Return JSON only.

Definitions:
- Morning: 06:00 to 11:59
- Afternoon: 12:00 to 16:59
- Evening: 17:00 to 21:59

Natural language guidance:
- "any available slot", "anytime", "any time", "whatever is available", "earliest available", "as soon as possible", "soonest", "I'm flexible", "any day", and "any slot" mean time_preference "any" and should prefer the earliest suitable slot.
- "every afternoon", "afternoons this week", or similar means time_preference "afternoon".
- "weekday evenings" means time_preference "evening".
- "mornings this week" means time_preference "morning".
- "online", "Teams", or "online if possible" means meeting_type "Online".
- "in person", "in-person", "offline", "physical", or "physical meeting" means meeting_type "In-person".

Allowed time_preference values:
- morning
- afternoon
- evening
- any
- unclear

Allowed meeting_type values:
- Online
- In-person
- unclear

Return JSON in this exact format:
{
  "understood_availability": {
    "summary": "Customer is free in the afternoons this week.",
    "time_preference": "afternoon",
    "meeting_type": "Online",
    "flexibility": "medium",
    "used_profile_meeting_type": false,
    "profile_meeting_type_used": null
  },
  "selected_slot_id": 12,
  "backup_slot_ids": [5, 18],
  "advisor_reason": "The selected slot matches the customer's afternoon preference, online meeting preference, and the advisor's relevant specialisation.",
  "user_message": "I found a suitable online afternoon slot within the next 7 days."
}
`;

  const userPrompt = `
CUSTOMER AVAILABILITY TEXT:
${availabilityText}

CUSTOMER PROFILE:
${JSON.stringify(customer || null, null, 2)}

PRODUCT INTEREST:
${productInterest || "General Prudential ILP"}

REAL CANDIDATE ADVISOR SLOTS:
${JSON.stringify(candidateSlots || [], null, 2)}

Choose only from the slot_id values in REAL CANDIDATE ADVISOR SLOTS.
If the customer's meeting type is unclear and the customer profile has no preferred meeting type, set selected_slot_id to null and meeting_type to "unclear".
`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { parsed } = await runAIJson({
      systemPrompt,
      userPrompt:
        attempt === 0
          ? userPrompt
          : `${userPrompt}\n\nThe previous response was invalid. Return valid JSON only using the exact schema.`,
    });

    if (parsed) {
      return parsed;
    }
  }

  return null;
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
    userPrompt,
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
        "Could you tell me your preferred meeting date, time range, and whether you prefer online or offline?",
    };
  }

  return parsed;
}
