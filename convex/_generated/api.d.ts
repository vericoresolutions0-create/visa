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
import type * as adminOrgs from "../adminOrgs.js";
import type * as agentAI from "../agentAI.js";
import type * as agentAIHelpers from "../agentAIHelpers.js";
import type * as agentReferralCommissions from "../agentReferralCommissions.js";
import type * as agentReviews from "../agentReviews.js";
import type * as agentTrials from "../agentTrials.js";
import type * as agents from "../agents.js";
import type * as ai__languageNames from "../ai/_languageNames.js";
import type * as ai_assistant from "../ai/assistant.js";
import type * as ai_photoChecker from "../ai/photoChecker.js";
import type * as ai_rejectionAnalyser from "../ai/rejectionAnalyser.js";
import type * as ai_successProbability from "../ai/successProbability.js";
import type * as aiFeedback from "../aiFeedback.js";
import type * as aiUsage from "../aiUsage.js";
import type * as approvalStories from "../approvalStories.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as authRateLimit from "../authRateLimit.js";
import type * as billing from "../billing.js";
import type * as blog from "../blog.js";
import type * as blogAI from "../blogAI.js";
import type * as caseIntelligenceActions from "../caseIntelligenceActions.js";
import type * as caseIntelligenceQueries from "../caseIntelligenceQueries.js";
import type * as caseReadiness from "../caseReadiness.js";
import type * as checklistAudit from "../checklistAudit.js";
import type * as checklistFlags from "../checklistFlags.js";
import type * as checklists from "../checklists.js";
import type * as clientIntakes from "../clientIntakes.js";
import type * as community from "../community.js";
import type * as contact from "../contact.js";
import type * as countryWatch from "../countryWatch.js";
import type * as creators from "../creators.js";
import type * as crons from "../crons.js";
import type * as dashboardInsights from "../dashboardInsights.js";
import type * as dataFreshness from "../dataFreshness.js";
import type * as dataFreshnessDigest from "../dataFreshnessDigest.js";
import type * as emailChange from "../emailChange.js";
import type * as emails_agentWelcome from "../emails/agentWelcome.js";
import type * as emails_clientDocumentUpload from "../emails/clientDocumentUpload.js";
import type * as emails_documentExpiry from "../emails/documentExpiry.js";
import type * as emails_emailChange from "../emails/emailChange.js";
import type * as emails_emailFailures from "../emails/emailFailures.js";
import type * as emails_employerInvite from "../emails/employerInvite.js";
import type * as emails_householdInvite from "../emails/householdInvite.js";
import type * as emails_policyUpdate from "../emails/policyUpdate.js";
import type * as emails_reminder from "../emails/reminder.js";
import type * as emails_sendEmail from "../emails/sendEmail.js";
import type * as emails_settleIn from "../emails/settleIn.js";
import type * as emails_welcome from "../emails/welcome.js";
import type * as embassyData from "../embassyData.js";
import type * as embassyMonitor from "../embassyMonitor.js";
import type * as employerCohort from "../employerCohort.js";
import type * as employerInvites from "../employerInvites.js";
import type * as fileTokens from "../fileTokens.js";
import type * as fileValidation from "../fileValidation.js";
import type * as household from "../household.js";
import type * as http from "../http.js";
import type * as influencers from "../influencers.js";
import type * as leadSentinel from "../leadSentinel.js";
import type * as licenseCodes from "../licenseCodes.js";
import type * as managedDependents from "../managedDependents.js";
import type * as marketplace from "../marketplace.js";
import type * as newsletter from "../newsletter.js";
import type * as notificationDispatch from "../notificationDispatch.js";
import type * as notificationProcessor from "../notificationProcessor.js";
import type * as notifications from "../notifications.js";
import type * as organizations from "../organizations.js";
import type * as partners from "../partners.js";
import type * as paystack from "../paystack.js";
import type * as platformStats from "../platformStats.js";
import type * as rateLimits from "../rateLimits.js";
import type * as referralRewards from "../referralRewards.js";
import type * as rejectionPatterns from "../rejectionPatterns.js";
import type * as rejections from "../rejections.js";
import type * as reminderDispatch from "../reminderDispatch.js";
import type * as reminderProcessor from "../reminderProcessor.js";
import type * as reminders from "../reminders.js";
import type * as riskScore from "../riskScore.js";
import type * as securityAudit from "../securityAudit.js";
import type * as seedAdmin from "../seedAdmin.js";
import type * as stripe from "../stripe.js";
import type * as systemHealth from "../systemHealth.js";
import type * as telegramBot from "../telegramBot.js";
import type * as travelLog from "../travelLog.js";
import type * as users from "../users.js";
import type * as vault from "../vault.js";
import type * as visaCorridors from "../visaCorridors.js";
import type * as visaStatus from "../visaStatus.js";
import type * as waitTimeTracker from "../waitTimeTracker.js";
import type * as wallOfFame from "../wallOfFame.js";
import type * as whatsappBot from "../whatsappBot.js";
import type * as whitelabel from "../whitelabel.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminOrgs: typeof adminOrgs;
  agentAI: typeof agentAI;
  agentAIHelpers: typeof agentAIHelpers;
  agentReferralCommissions: typeof agentReferralCommissions;
  agentReviews: typeof agentReviews;
  agentTrials: typeof agentTrials;
  agents: typeof agents;
  "ai/_languageNames": typeof ai__languageNames;
  "ai/assistant": typeof ai_assistant;
  "ai/photoChecker": typeof ai_photoChecker;
  "ai/rejectionAnalyser": typeof ai_rejectionAnalyser;
  "ai/successProbability": typeof ai_successProbability;
  aiFeedback: typeof aiFeedback;
  aiUsage: typeof aiUsage;
  approvalStories: typeof approvalStories;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  authRateLimit: typeof authRateLimit;
  billing: typeof billing;
  blog: typeof blog;
  blogAI: typeof blogAI;
  caseIntelligenceActions: typeof caseIntelligenceActions;
  caseIntelligenceQueries: typeof caseIntelligenceQueries;
  caseReadiness: typeof caseReadiness;
  checklistAudit: typeof checklistAudit;
  checklistFlags: typeof checklistFlags;
  checklists: typeof checklists;
  clientIntakes: typeof clientIntakes;
  community: typeof community;
  contact: typeof contact;
  countryWatch: typeof countryWatch;
  creators: typeof creators;
  crons: typeof crons;
  dashboardInsights: typeof dashboardInsights;
  dataFreshness: typeof dataFreshness;
  dataFreshnessDigest: typeof dataFreshnessDigest;
  emailChange: typeof emailChange;
  "emails/agentWelcome": typeof emails_agentWelcome;
  "emails/clientDocumentUpload": typeof emails_clientDocumentUpload;
  "emails/documentExpiry": typeof emails_documentExpiry;
  "emails/emailChange": typeof emails_emailChange;
  "emails/emailFailures": typeof emails_emailFailures;
  "emails/employerInvite": typeof emails_employerInvite;
  "emails/householdInvite": typeof emails_householdInvite;
  "emails/policyUpdate": typeof emails_policyUpdate;
  "emails/reminder": typeof emails_reminder;
  "emails/sendEmail": typeof emails_sendEmail;
  "emails/settleIn": typeof emails_settleIn;
  "emails/welcome": typeof emails_welcome;
  embassyData: typeof embassyData;
  embassyMonitor: typeof embassyMonitor;
  employerCohort: typeof employerCohort;
  employerInvites: typeof employerInvites;
  fileTokens: typeof fileTokens;
  fileValidation: typeof fileValidation;
  household: typeof household;
  http: typeof http;
  influencers: typeof influencers;
  leadSentinel: typeof leadSentinel;
  licenseCodes: typeof licenseCodes;
  managedDependents: typeof managedDependents;
  marketplace: typeof marketplace;
  newsletter: typeof newsletter;
  notificationDispatch: typeof notificationDispatch;
  notificationProcessor: typeof notificationProcessor;
  notifications: typeof notifications;
  organizations: typeof organizations;
  partners: typeof partners;
  paystack: typeof paystack;
  platformStats: typeof platformStats;
  rateLimits: typeof rateLimits;
  referralRewards: typeof referralRewards;
  rejectionPatterns: typeof rejectionPatterns;
  rejections: typeof rejections;
  reminderDispatch: typeof reminderDispatch;
  reminderProcessor: typeof reminderProcessor;
  reminders: typeof reminders;
  riskScore: typeof riskScore;
  securityAudit: typeof securityAudit;
  seedAdmin: typeof seedAdmin;
  stripe: typeof stripe;
  systemHealth: typeof systemHealth;
  telegramBot: typeof telegramBot;
  travelLog: typeof travelLog;
  users: typeof users;
  vault: typeof vault;
  visaCorridors: typeof visaCorridors;
  visaStatus: typeof visaStatus;
  waitTimeTracker: typeof waitTimeTracker;
  wallOfFame: typeof wallOfFame;
  whatsappBot: typeof whatsappBot;
  whitelabel: typeof whitelabel;
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
