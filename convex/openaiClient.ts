import OpenAI from "openai";

// Single chokepoint for constructing an OpenAI client — every AI-calling
// action in this app (Case Intelligence, the Agent AI Assistant, blog
// translation, the Embassy Monitor's change-summariser) goes through this
// instead of calling `new OpenAI(...)` directly, so the one thing that
// actually matters here — a real request timeout — can never drift out of
// sync between the four call sites, or get silently forgotten on a fifth.
//
// 45 seconds is generous for even a long structured-JSON response or a
// full blog-article translation, while still failing fast enough that a
// user-facing action (Case Intelligence, the chat assistant) doesn't leave
// someone staring at a spinner for anywhere near the SDK's own 10-minute
// default. The SDK retries a request that times out by default (2 retries,
// each with its own fresh timeout window), so a single slow response still
// gets real second chances before this actually throws — and when it does
// throw, `OpenAI.APIConnectionTimeoutError` is a subclass of
// `OpenAI.APIError`, so every existing `instanceof OpenAI.APIError` catch
// block in this codebase already handles a timeout exactly like any other
// API failure, with no changes needed there.
const OPENAI_REQUEST_TIMEOUT_MS = 45_000;

export function getOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, timeout: OPENAI_REQUEST_TIMEOUT_MS });
}
