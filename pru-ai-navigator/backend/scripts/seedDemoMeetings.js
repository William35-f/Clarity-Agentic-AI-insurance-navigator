import pool from "../db.js";

const demoCases = [
  {
    name: "Mei Lin Koh",
    age: 36,
    occupation: "Operations Manager",
    income: 7200,
    risk: "Low",
    goal: "Protect family against medical expenses",
    insurance: "Integrated Shield Plan",
    meetingType: "Online",
    advisorId: 2,
    dayOffset: 0,
    hour: 15,
    product: "Health Protection",
    status: "Booked",
    question: "Will my existing medical plan cover every hospital expense?",
    missingField: "dependants",
    missingQuestion: "Who currently depends on your income and protection coverage?"
  },
  {
    name: "Rachel Goh",
    age: 31,
    occupation: "Product Designer",
    income: 6800,
    risk: "Medium",
    goal: "Build long-term wealth with regular income",
    insurance: "Term life and hospital insurance",
    meetingType: "Online",
    advisorId: 3,
    dayOffset: 1,
    hour: 10,
    product: "PRUVantage Prosper",
    status: "Booked",
    question: "The monthly income is guaranteed, right?",
    missingField: "investment time horizon",
    missingQuestion: "How long do you expect to keep the policy active?"
  },
  {
    name: "Arun Kumar",
    age: 42,
    occupation: "Engineering Lead",
    income: 10500,
    risk: "Medium",
    goal: "Protect spouse and two children",
    insurance: "Employer group insurance and term life",
    meetingType: "Offline",
    advisorId: 4,
    dayOffset: 2,
    hour: 14,
    product: "Life Protection",
    status: "Booked",
    question: "How can I estimate how much life coverage my family needs?"
  },
  {
    name: "Sofia Lim",
    age: 25,
    occupation: "UX Researcher",
    income: 4900,
    risk: "Not assessed",
    goal: "Understand what insurance coverage to start with",
    insurance: "Employer medical benefits only",
    meetingType: "Online",
    advisorId: 4,
    dayOffset: 4,
    hour: 11,
    product: "General Insurance Exploration",
    status: "Booked",
    question: "I am not sure whether I need health, life, or wealth coverage first.",
    missingField: "monthly premium budget",
    missingQuestion: "What monthly premium range would be comfortable for you?"
  },
  {
    name: "Daniel Wong",
    age: 39,
    occupation: "Teacher",
    income: 6100,
    risk: "Low",
    goal: "Review medical and critical illness gaps",
    insurance: "Integrated Shield Plan and basic critical illness rider",
    meetingType: "Offline",
    advisorId: 2,
    dayOffset: -1,
    hour: 16,
    product: "Medical and Critical Illness Review",
    status: "Completed",
    question: "How does critical illness coverage differ from hospital coverage?"
  },
  {
    name: "Grace Ng",
    age: 47,
    occupation: "Business Owner",
    income: 14000,
    risk: "Medium",
    goal: "Balance retirement income and legacy planning",
    insurance: "Whole life, hospital and personal accident plans",
    meetingType: "Online",
    advisorId: 8,
    dayOffset: -7,
    hour: 10,
    product: "Wealth and Legacy Planning",
    status: "Completed",
    question: "What follow-up information should I review before deciding next steps?"
  }
];

function meetingDate(dayOffset, hour) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date;
}

async function findOrCreateCustomer(connection, item) {
  const [existing] = await connection.execute(
    "SELECT customer_id FROM customer WHERE full_name = ? LIMIT 1",
    [item.name]
  );

  if (existing[0]) {
    await connection.execute(
      `UPDATE customer
       SET age = ?, occupation = ?, monthly_income = ?, risk_appetite = ?,
           main_goal = ?, existing_insurance = ?, preferred_meeting_type = ?
       WHERE customer_id = ?`,
      [
        item.age,
        item.occupation,
        item.income,
        item.risk,
        item.goal,
        item.insurance,
        item.meetingType,
        existing[0].customer_id
      ]
    );
    return existing[0].customer_id;
  }

  const [result] = await connection.execute(
    `INSERT INTO customer
     (full_name, age, occupation, monthly_income, risk_appetite, main_goal,
      existing_insurance, preferred_meeting_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.name,
      item.age,
      item.occupation,
      item.income,
      item.risk,
      item.goal,
      item.insurance,
      item.meetingType
    ]
  );
  return result.insertId;
}

async function ensureCustomerContact(connection, customerId, name) {
  const localPart = String(name || `customer-${customerId}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
  await connection.execute(
    `INSERT INTO customercontact (customer_id, email) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE email = VALUES(email)`,
    [customerId, `${localPart}@example.com`]
  );
}

async function ensureContext(connection, customerId, item) {
  const [questionRows] = await connection.execute(
    "SELECT question_id FROM questionlog WHERE customer_id = ? AND question = ? LIMIT 1",
    [customerId, item.question]
  );
  if (!questionRows[0]) {
    await connection.execute(
      `INSERT INTO questionlog
       (customer_id, question, related_product, needs_advisor_clarification)
       VALUES (?, ?, ?, TRUE)`,
      [customerId, item.question, item.product]
    );
    await connection.execute(
      "INSERT INTO chatmessage (customer_id, role, message) VALUES (?, 'user', ?)",
      [customerId, item.question]
    );
  }

  const [interestRows] = await connection.execute(
    "SELECT interest_id FROM productinterest WHERE customer_id = ? LIMIT 1",
    [customerId]
  );
  if (!interestRows[0]) {
    await connection.execute(
      `INSERT INTO productinterest
       (customer_id, product_category, reason, confidence)
       VALUES (?, ?, ?, 'High')`,
      [customerId, item.product, `Demo case aligned to ${item.goal}.`]
    );
  }

  if (item.missingField) {
    const [missingRows] = await connection.execute(
      "SELECT missing_id FROM missinginfo WHERE customer_id = ? AND field_name = ? LIMIT 1",
      [customerId, item.missingField]
    );
    if (!missingRows[0]) {
      await connection.execute(
        `INSERT INTO missinginfo (customer_id, field_name, question, is_answered)
         VALUES (?, ?, ?, FALSE)`,
        [customerId, item.missingField, item.missingQuestion]
      );
    }
  }
}

async function ensureMeeting(connection, customerId, item) {
  const start = meetingDate(item.dayOffset, item.hour);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const [existing] = await connection.execute(
    "SELECT meeting_id, slot_id FROM meeting WHERE customer_id = ? LIMIT 1",
    [customerId]
  );

  if (existing[0]) {
    await connection.execute(
      `UPDATE meeting
       SET advisor_id = ?, meeting_type = ?, meeting_datetime = ?,
           product_interest = ?, status = ?
       WHERE meeting_id = ?`,
      [
        item.advisorId,
        item.meetingType,
        start,
        item.product,
        item.status,
        existing[0].meeting_id
      ]
    );
    if (existing[0].slot_id) {
      await connection.execute(
        `UPDATE advisorslot
         SET advisor_id = ?, start_datetime = ?, end_datetime = ?,
             meeting_type = ?, is_booked = TRUE
         WHERE slot_id = ?`,
        [item.advisorId, start, end, item.meetingType, existing[0].slot_id]
      );
    }
    return existing[0].meeting_id;
  }

  const [slot] = await connection.execute(
    `INSERT INTO advisorslot
     (advisor_id, start_datetime, end_datetime, meeting_type, is_booked)
     VALUES (?, ?, ?, ?, TRUE)`,
    [item.advisorId, start, end, item.meetingType]
  );
  const [meeting] = await connection.execute(
    `INSERT INTO meeting
     (customer_id, advisor_id, slot_id, meeting_type, meeting_datetime,
      product_interest, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      customerId,
      item.advisorId,
      slot.insertId,
      item.meetingType,
      start,
      item.product,
      item.status
    ]
  );
  return meeting.insertId;
}

async function ensureCompletedRecord(connection, meetingId, item) {
  if (String(item.status).toLowerCase() !== "completed") return;
  const [existing] = await connection.execute(
    "SELECT record_id FROM postmeetingrecord WHERE meeting_id = ? LIMIT 1",
    [meetingId]
  );
  if (existing[0]) return;

  const checklist = [
    { text: "Customer goals and priorities confirmed", completed: true },
    { text: "Existing coverage and important gaps reviewed", completed: true },
    { text: "Affordability, limitations, and non-guaranteed outcomes explained", completed: true },
    { text: "Customer documents and next actions confirmed", completed: false }
  ];
  const followUpTasks = [
    { task: `Send ${item.name} the agreed consultation information and next-step summary`, owner: "Advisor", completed: false },
    { task: "Review the requested policy or coverage documents", owner: "Customer", completed: false },
    { task: "Confirm whether another advisor discussion is required", owner: "Advisor", completed: false }
  ];
  await connection.execute(
    `INSERT INTO postmeetingrecord
     (meeting_id, summary, notes, checklist, follow_up_tasks, approval_status, approved_at)
     VALUES (?, ?, ?, ?, ?, 'Approved', NOW())`,
    [
      meetingId,
      `${item.name} completed a ${item.meetingType.toLowerCase()} consultation about ${item.product}. The advisor reviewed the customer's goals, current coverage, key considerations, and agreed next actions.`,
      "Advisor reviewed the generated record and approved it for follow-up.",
      JSON.stringify(checklist),
      JSON.stringify(followUpTasks)
    ]
  );
}

async function seed() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [advisorRows] = await connection.execute(
      "SELECT advisor_id FROM advisor ORDER BY advisor_id"
    );
    const advisorIds = advisorRows.map((advisor) => advisor.advisor_id);
    if (advisorIds.length === 0) {
      throw new Error("No advisors exist. Import the base schema before seeding demo meetings.");
    }

    for (const [index, demoCase] of demoCases.entries()) {
      const item = {
        ...demoCase,
        advisorId: advisorIds.includes(demoCase.advisorId)
          ? demoCase.advisorId
          : advisorIds[index % advisorIds.length]
      };
      const customerId = await findOrCreateCustomer(connection, item);
      await ensureCustomerContact(connection, customerId, item.name);
      await ensureContext(connection, customerId, item);
      const meetingId = await ensureMeeting(connection, customerId, item);
      await ensureCompletedRecord(connection, meetingId, item);
    }
    await connection.commit();
    console.log(`Seeded ${demoCases.length} Clarity demo meetings.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error("Failed to seed demo meetings:", error.message);
  process.exitCode = 1;
});
