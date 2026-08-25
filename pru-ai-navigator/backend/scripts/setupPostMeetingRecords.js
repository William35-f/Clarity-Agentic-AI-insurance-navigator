import pool from "../db.js";

async function setup() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS postmeetingrecord (
      record_id INT NOT NULL AUTO_INCREMENT,
      meeting_id INT NOT NULL,
      summary TEXT NOT NULL,
      notes LONGTEXT NOT NULL,
      checklist LONGTEXT NOT NULL,
      follow_up_tasks LONGTEXT NOT NULL,
      approval_status VARCHAR(30) NOT NULL DEFAULT 'Draft',
      approved_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (record_id),
      UNIQUE KEY uq_postmeetingrecord_meeting (meeting_id),
      CONSTRAINT fk_postmeetingrecord_meeting
        FOREIGN KEY (meeting_id) REFERENCES meeting (meeting_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  console.log("Post-meeting record storage is ready.");
  await pool.end();
}

setup().catch((error) => {
  console.error("Failed to set up post-meeting records:", error.message);
  process.exitCode = 1;
});
