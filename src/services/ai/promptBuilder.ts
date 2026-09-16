// Shared prompt template — every provider (local + BYOK) extracts the same
// flat JSON shape from free text, so responseParser.ts can stay provider-agnostic.

import type { ProposalContext } from './types';

export const PROPOSAL_JSON_SHAPE = `{
  "transactionType": "expense" | "income" | "transfer" | "refund" | "adjustment",
  "amount": number,
  "merchant": string | null,
  "category": string | null,
  "account": string | null,
  "date": string | null,
  "note": string | null
}`;

export function buildProposalPrompt(text: string, context: ProposalContext): string {
  const accountNames = context.accounts.map((a) => a.name).join(', ') || '(none)';
  const categoryNames = context.categories.map((c) => c.name).join(', ') || '(none)';

  return `You are a transaction-parsing assistant for an expense tracker app used in India (currency: INR).
Extract a single transaction from the user's message and respond with ONLY one JSON object matching this shape:
${PROPOSAL_JSON_SHAPE}

Rules:
- "amount" is in rupees (e.g. 450.50 for ₹450.50), always positive.
- "category" must be one of these exact names, or null if none fit: ${categoryNames}
- "account" must be one of these exact names, or null if unclear: ${accountNames}
- "date" is an ISO 8601 date/time, or null if the message doesn't mention when. Today is ${context.now}.
- If a field is not mentioned or unclear, use null rather than guessing.
- Respond with ONLY the JSON object, no other text.

Example:
Message: "spent 250 on lunch at Swiggy"
Response: {"transactionType":"expense","amount":250,"merchant":"Swiggy","category":"Food & Dining","account":null,"date":"${context.now}","note":null}

Message: "${text}"
Response:`;
}
