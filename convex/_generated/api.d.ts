/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as agents from "../agents.js";
import type * as ai_assistant from "../ai/assistant.js";
import type * as ai_photoChecker from "../ai/photoChecker.js";
import type * as ai_rejectionAnalyser from "../ai/rejectionAnalyser.js";
import type * as ai_successProbability from "../ai/successProbability.js";
import type * as aiUsage from "../aiUsage.js";
import type * as checklists from "../checklists.js";
import type * as clientIntakes from "../clientIntakes.js";
import type * as contact from "../contact.js";
import type * as countryWatch from "../countryWatch.js";
import type * as crons from "../crons.js";
import type * as dashboardInsights from "../dashboardInsights.js";
import type * as emails_policyUpdate from "../emails/policyUpdate.js";
import type * as emails_reminder from "../emails/reminder.js";
import type * as emails_welcome from "../emails/welcome.js";
import type * as platformStats from "../platformStats.js";
import type * as rateLimits from "../rateLimits.js";
import type * as rejections from "../rejections.js";
import type * as reminderDispatch from "../reminderDispatch.js";
import type * as reminderProcessor from "../reminderProcessor.js";
import type * as reminders from "../reminders.js";
import type * as users from "../users.js";
import type * as vault from "../vault.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  agents: typeof agents;
  "ai/assistant": typeof ai_assistant;
  "ai/photoChecker": typeof ai_photoChecker;
  "ai/rejectionAnalyser": typeof ai_rejectionAnalyser;
  "ai/successProbability": typeof ai_successProbability;
  aiUsage: typeof aiUsage;
  checklists: typeof checklists;
  clientIntakes: typeof clientIntakes;
  contact: typeof contact;
  countryWatch: typeof countryWatch;
  crons: typeof crons;
  dashboardInsights: typeof dashboardInsights;
  "emails/policyUpdate": typeof emails_policyUpdate;
  "emails/reminder": typeof emails_reminder;
  "emails/welcome": typeof emails_welcome;
  platformStats: typeof platformStats;
  rateLimits: typeof rateLimits;
  rejections: typeof rejections;
  reminderDispatch: typeof reminderDispatch;
  reminderProcessor: typeof reminderProcessor;
  reminders: typeof reminders;
  users: typeof users;
  vault: typeof vault;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
