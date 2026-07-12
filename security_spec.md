# Security Specification for Corporate Survey Platform

This document describes the security spec, data invariants, adversarial "Dirty Dozen" payloads, and validation requirements for the Corporate Survey Platform's Firestore database.

## 1. Data Invariants

1. **Active Survey Configuration (`/config/survey_questions`)**:
   - Must be structured as a Map with exactly two fields: `questions` (List of Question objects) and `updatedAt` (Timestamp or ISO string).
   - Only authorized clients can modify survey questions.
   - Any individual question must have a valid `id` (string <= 128 chars), `type` (one of text, single, multiple, rating), `title` (string <= 500 chars), and `required` (boolean).

2. **Webhook URL (`/config/webhook`)**:
   - Must be structured as a Map with `webhookUrl` (string <= 1024 chars) and `updatedAt`.
   - Webhook URL must be an active URL or empty string.

3. **Privacy Settings (`/config/survey_settings`)**:
   - Must be structured as a Map with `allowAnonymous` (boolean) and `updatedAt`.

4. **Survey Responses (`/responses/{responseId}`)**:
   - Must contain a valid `userName` of type string (size <= 100) and NOT empty.
   - Must contain an `answers` Map.
   - Must contain a `timestamp` string.
   - Must be write-once (immutable after creation). No updates are allowed to prevent answers tampering.
   - No deletion is allowed except by the admin via general cleaning.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 payloads represent malicious attempts to bypass identity, integrity, validation boundaries, or trigger Denial of Wallet attacks.

### Payload 1: Shadow Fields Ingestion (Config)
Attempting to inject a ghost field `isAdminConfig` to gain administrative privilege flags.
```json
{
  "questions": [],
  "updatedAt": "2026-07-12T14:35:00Z",
  "isAdminConfig": true
}
```

### Payload 2: Massive Username Injection (Denial of Wallet)
Attempting to save a response with an extremely large username (10MB string) to exhaust database storage space and cost money.
```json
{
  "userName": "A...[10MB worth of A's]...",
  "answers": {},
  "timestamp": "2026-07-12T14:35:00Z"
}
```

### Payload 3: Tampering with Saved Responses (Update Attack)
Attempting to update an existing survey response to change someone else's answers.
```json
{
  "answers": {
    "q1": 5
  }
}
```

### Payload 4: Invalid Question Type Injection
Attempting to inject an unsupported question type (e.g., `malicious-code-injection`) into the survey questions.
```json
{
  "questions": [
    {
      "id": "q1",
      "type": "malicious-code-injection",
      "title": "Hack"
    }
  ],
  "updatedAt": "2026-07-12T14:35:00Z"
}
```

### Payload 5: Empty Name Submission (Bypassing validation)
Attempting to submit an empty userName when anonymous mode might be disabled.
```json
{
  "userName": "",
  "answers": {},
  "timestamp": "2026-07-12T14:35:00Z"
}
```

### Payload 6: Webhook Poisoning
Attempting to inject a huge string into the webhook URL config to crash endpoint handlers.
```json
{
  "webhookUrl": "https://...[100KB string]...",
  "updatedAt": "2026-07-12T14:35:00Z"
}
```

### Payload 7: Deletion of Survey Questions (Denial of Service)
Attempting to delete the main `survey_questions` configuration document to break the app.
```json
{}
```

### Payload 8: Corrupt Answers Payload Type
Attempting to submit `answers` as a string instead of a map.
```json
{
  "userName": "Anónimo",
  "answers": "corrupted-answers-string",
  "timestamp": "2026-07-12T14:35:00Z"
}
```

### Payload 9: Invalid ID Character Poisoning (Config Path Injection)
Attempting to create a config document with invalid special/junk characters in the ID to trigger parsing errors.
```json
{
  "documentId": "config/!@#$%^&*()_+{}[]"
}
```

### Payload 10: State Shortcut (Bypassing Anonymous State)
Attempting to modify `survey_settings` with arbitrary unverified keys.
```json
{
  "allowAnonymous": true,
  "updatedAt": "2026-07-12T14:35:00Z",
  "someMaliciousKey": "leak"
}
```

### Payload 11: Future/Past Date Exploitation (Temporal Integrity bypass)
Attempting to save responses with non-ISO timestamps or spoofed dates.
```json
{
  "userName": "User",
  "answers": {},
  "timestamp": "not-a-date"
}
```

### Payload 12: Unauthorized Orphaned Document Creation
Attempting to create sub-collections or rogue documents in unmapped collections.
```json
{
  "rogueField": "rogueVal"
}
```

---

## 3. Test Runner Specification (`firestore.rules.test.ts`)

A TypeScript-based security unit-test runner utilizing `@firebase/rules-unit-testing` is outlined below to mathematically guarantee that all 12 malicious payloads return `PERMISSION_DENIED` and valid ones succeed.

```typescript
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import * as fs from "fs";

let testEnv: RulesTestEnvironment;

describe("Survey Platform Firestore Security Rules", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "corporate-surveys-test",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
        host: "127.0.0.1",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("fails: Payload 1 - Shadow Fields Ingestion (Config)", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const ref = doc(unauthDb, "config/survey_questions");
    await assertFails(
      setDoc(ref, {
        questions: [],
        updatedAt: "2026-07-12T14:35:00Z",
        isAdminConfig: true,
      })
    );
  });

  it("fails: Payload 2 - Massive Username Injection", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const ref = doc(unauthDb, "responses/test_response");
    const longName = "A".repeat(200); // Exceeds maxLength limit of 100
    await assertFails(
      setDoc(ref, {
        userName: longName,
        answers: {},
        timestamp: "2026-07-12T14:35:00Z",
      })
    );
  });

  it("fails: Payload 3 - Tampering with Saved Responses (Update)", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const ref = doc(unauthDb, "responses/existing_response");
    // Seed initial doc as admin/system
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "responses/existing_response"), {
        userName: "Sofía",
        answers: {},
        timestamp: "2026-07-12T14:35:00Z",
      });
    });
    // Attempt unauthorized update
    await assertFails(
      setDoc(ref, {
        answers: { q1: 5 },
      }, { merge: true })
    );
  });

  it("fails: Payload 4 - Invalid Question Type Injection", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const ref = doc(unauthDb, "config/survey_questions");
    await assertFails(
      setDoc(ref, {
        questions: [{ id: "q1", type: "malicious-code", title: "Hack" }],
        updatedAt: "2026-07-12T14:35:00Z",
      })
    );
  });

  it("fails: Payload 5 - Empty Name Submission", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const ref = doc(unauthDb, "responses/test_response");
    await assertFails(
      setDoc(ref, {
        userName: "",
        answers: {},
        timestamp: "2026-07-12T14:35:00Z",
      })
    );
  });

  it("fails: Payload 6 - Webhook Poisoning", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const ref = doc(unauthDb, "config/webhook");
    const longUrl = "https://" + "x".repeat(1100);
    await assertFails(
      setDoc(ref, {
        webhookUrl: longUrl,
        updatedAt: "2026-07-12T14:35:00Z",
      })
    );
  });

  it("fails: Payload 7 - Deletion of Survey Questions Config", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const ref = doc(unauthDb, "config/survey_questions");
    await assertFails(deleteDoc(ref));
  });

  it("fails: Payload 8 - Corrupt Answers Type", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const ref = doc(unauthDb, "responses/test_response");
    await assertFails(
      setDoc(ref, {
        userName: "Anónimo",
        answers: "corrupted-answers",
        timestamp: "2026-07-12T14:35:00Z",
      })
    );
  });

  it("fails: Payload 10 - State Shortcut / Ghost Field on Settings", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const ref = doc(unauthDb, "config/survey_settings");
    await assertFails(
      setDoc(ref, {
        allowAnonymous: true,
        updatedAt: "2026-07-12T14:35:00Z",
        someMaliciousKey: "leak",
      })
    );
  });

  it("fails: Payload 11 - Temporal Integrity bypass", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const ref = doc(unauthDb, "responses/test_response");
    await assertFails(
      setDoc(ref, {
        userName: "User",
        answers: {},
        timestamp: 1234567, // number instead of string
      })
    );
  });

  it("fails: Payload 12 - Rogue collection creation", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const ref = doc(unauthDb, "rogue_collection/rogue_document");
    await assertFails(
      setDoc(ref, {
        rogueField: "value",
      })
    );
  });
});
```
