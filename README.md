# Hackathon_agenticAI

## Local demo setup

### 1. Create and seed the MySQL database

The backend schema and demo data are in `pru-ai-navigator/backend/schema.sql`.
Import it with MySQL 8:

```powershell
Get-Content -Raw .\pru-ai-navigator\backend\schema.sql | mysql -u root -p
```

The script creates and selects the `pru_ai_navigator` database. It also seeds
advisor availability relative to the import date so meeting matching has slots
inside the next seven days.

### 2. Configure the backend

Update `pru-ai-navigator/backend/.env` with the local MySQL credentials, the
school-provided OpenAI API key, and an OpenAI model available to that project.
The `.env` file is ignored by Git and must not be committed.

### 3. Install and start the backend

```powershell
cd pru-ai-navigator/backend
npm ci
npm run setup:post-meeting
npm run setup:workflow
npm run seed:demo
npm run dev
```

`npm run setup:post-meeting` safely creates the persistent post-meeting record
table when it is missing. The main schema also includes this table for fresh
database imports.

`npm run setup:workflow` creates customer contact, demo email receipt, and
advisor activity-log storage.

`npm run seed:demo` adds six reusable appointments relative to the current
date: four upcoming preparation cases and two completed meetings. It is safe to
run again because it updates the same demo customers instead of duplicating
them.

The backend runs on `http://localhost:5000` by default.

### 4. Install and start the frontend

In a second terminal:

```powershell
cd pru-ai-navigator/frontend
npm ci
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

### Demo follow-up flow

1. Switch to **Advisor** and open **Meeting Manager**.
2. Complete and approve a meeting record in **Meeting Assistant**.
3. Open **Follow-up Agent**. Its queue contains only approved records whose
   Meeting Manager slot is completed.
4. Review the task, generate a customer message, edit it if needed, and select
   **Send to Customer**.
5. Open **Activity Log** to show the email draft, delivery receipt, and task
   actions recorded against the completed meeting.

The demo email delivery and masked recipient receipt are stored in MySQL. The
UI labels this as demo delivery and does not claim to use an external email,
SMS, Teams, or WhatsApp provider.
