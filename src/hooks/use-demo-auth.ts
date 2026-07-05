import { useCallback, useSyncExternalStore } from "react";

export type DemoUser = {
  name: string;
  email: string;
  phone?: string;
  country?: string;
  plan: "free" | "pro" | "expert";
  role: "user" | "admin";
  referralCode: string;
  billingCycle?: "monthly" | "yearly";
  subscriptionAmountCents?: number;
  agentPlan?: "agent_listing" | "agent_featured" | "agency_white_label";
  agentBillingCycle?: "monthly" | "yearly";
  agentSubscriptionAmountCents?: number;
  agentSubscriptionStartedAt?: string;
  lastAgentPaymentAt?: string;
  paymentMethod?: {
    type: "card" | "bank";
    brand?: string;
    last4: string;
    nameOnMethod: string;
    expiresAt?: string;
    billingEmail: string;
    updatedAt: string;
  };
  payoutSetup?: {
    method: "bank" | "mobile_money" | "paypal";
    accountName: string;
    country: string;
    bankName?: string;
    accountNumberLast4?: string;
    mobileMoneyProvider?: string;
    mobileMoneyLast4?: string;
    paypalEmail?: string;
    updatedAt: string;
  };
};

const DEMO_AUTH_KEY = "vc_demo_user";
const DEMO_AUTH_EVENT = "vc_demo_auth_change";
let cachedStoredUser: string | null = null;
let cachedDemoUser: DemoUser | null = null;

const defaultDemoUser: DemoUser = {
  name: "Demo User",
  email: "demo@visaclear.app",
  phone: "+1 555 0100",
  plan: "expert",
  role: "user",
  referralCode: "DEMO20",
  billingCycle: "yearly",
  subscriptionAmountCents: 14900,
  paymentMethod: {
    type: "card",
    brand: "Visa",
    last4: "4242",
    nameOnMethod: "Demo User",
    expiresAt: "12/30",
    billingEmail: "demo@visaclear.app",
    updatedAt: new Date().toISOString(),
  },
};

function emitDemoAuthChange() {
  window.dispatchEvent(new Event(DEMO_AUTH_EVENT));
}

function clearDemoUserCache() {
  cachedStoredUser = null;
  cachedDemoUser = null;
}

function writeDemoUser(user: DemoUser) {
  const stored = JSON.stringify(user);
  cachedStoredUser = stored;
  cachedDemoUser = user;
  localStorage.setItem(DEMO_AUTH_KEY, stored);
}

function readDemoUser() {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(DEMO_AUTH_KEY);
  if (!stored) {
    clearDemoUserCache();
    return null;
  }

  if (stored === cachedStoredUser) {
    return cachedDemoUser;
  }

  try {
    cachedStoredUser = stored;
    cachedDemoUser = { ...defaultDemoUser, ...JSON.parse(stored) } as DemoUser;
    return cachedDemoUser;
  } catch {
    localStorage.removeItem(DEMO_AUTH_KEY);
    clearDemoUserCache();
    return null;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(DEMO_AUTH_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(DEMO_AUTH_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function signInDemoUser(overrides?: Partial<DemoUser>) {
  const user = { ...defaultDemoUser, ...overrides };
  writeDemoUser(user);
  localStorage.setItem("vc_onboarded", "1");
  emitDemoAuthChange();
  return user;
}

export function signOutDemoUser() {
  localStorage.removeItem(DEMO_AUTH_KEY);
  clearDemoUserCache();
  emitDemoAuthChange();
}

export function updateDemoUser(patch: Partial<DemoUser>) {
  const user = { ...defaultDemoUser, ...readDemoUser(), ...patch };
  writeDemoUser(user);
  emitDemoAuthChange();
  return user;
}

export function useDemoAuth() {
  const user = useSyncExternalStore(subscribe, readDemoUser, () => null);

  const signIn = useCallback((overrides?: Partial<DemoUser>) => {
    return signInDemoUser(overrides);
  }, []);

  const signOut = useCallback(() => {
    signOutDemoUser();
  }, []);

  const updateUser = useCallback((patch: Partial<DemoUser>) => {
    return updateDemoUser(patch);
  }, []);

  return {
    isDemoAuthenticated: Boolean(user),
    user,
    signIn,
    signOut,
    updateUser,
  };
}
