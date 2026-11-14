import pool from "../db.js";

async function ensureColumn(tableName, columnName, definition) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tableName, columnName]
  );
  if (rows.length === 0) {
    await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  }
}

async function setup() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS customercontact (
      customer_id INT NOT NULL,
      email VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (customer_id),
      CONSTRAINT fk_customercontact_customer
        FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS advisoractivitylog (
      activity_id INT NOT NULL AUTO_INCREMENT,
      advisor_id INT NULL,
      meeting_id INT NULL,
      activity_type VARCHAR(60) NOT NULL,
      title VARCHAR(255) NOT NULL,
      details TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (activity_id),
      KEY idx_activity_created (created_at),
      KEY idx_activity_advisor (advisor_id),
      KEY idx_activity_meeting (meeting_id),
      CONSTRAINT fk_activity_advisor FOREIGN KEY (advisor_id) REFERENCES advisor (advisor_id) ON DELETE SET NULL,
      CONSTRAINT fk_activity_meeting FOREIGN KEY (meeting_id) REFERENCES meeting (meeting_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await ensureColumn("advisoremailpreview", "recipient_email", "VARCHAR(255) NULL");
  await ensureColumn("advisoremailpreview", "delivery_status", "VARCHAR(30) NULL");
  await ensureColumn("advisoremailpreview", "delivery_reference", "VARCHAR(80) NULL");

  const [customers] = await pool.execute(
    `SELECT C.customer_id, C.full_name
     FROM customer C
     LEFT JOIN customercontact CC ON C.customer_id = CC.customer_id
     WHERE CC.customer_id IS NULL`
  );
  for (const customer of customers) {
    const localPart = String(customer.full_name || `customer-${customer.customer_id}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.|\.$/g, "");
    await pool.execute(
      `INSERT INTO customercontact (customer_id, email) VALUES (?, ?)`,
      [customer.customer_id, `${localPart}.${customer.customer_id}@example.com`]
    );
  }

  console.log(`Advisor email demo and activity storage are ready. Backfilled ${customers.length} customer contact(s).`);
  await pool.end();
}

setup().catch((error) => {
  console.error("Failed to set up advisor workflow:", error.message);
  process.exitCode = 1;
});
