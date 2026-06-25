import { signInDemoUser } from "@/hooks/use-demo-auth.ts";

const LOCAL_USERS_KEY = "vc_local_users";

type LocalSavedUser = {
  email: string;
  password: string;
  name: string;
  provider: "local" | "google";
  createdAt: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readLocalUsers(): LocalSavedUser[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LocalSavedUser[];
  } catch {
    localStorage.removeItem(LOCAL_USERS_KEY);
    return [];
  }
}

function writeLocalUsers(users: LocalSavedUser[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function findLocalUser(email: string) {
  return readLocalUsers().find((user) => user.email === normalizeEmail(email));
}

function deriveNameFromEmail(email: string) {
  const prefix = normalizeEmail(email).split("@")[0] || "User";
  return prefix.replace(/[._\d]+/g, " ").replace(/\s+/g, " ").trim() || "VisaClear User";
}

export function authenticateLocalUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = findLocalUser(normalizedEmail);
  if (!user) {
    throw new Error("No account found for this email. Please sign up first.");
  }
  if (user.password !== password) {
    throw new Error("Incorrect password. Please try again.");
  }
  return user;
}

export function registerLocalUser(email: string, password: string, provider: "local" | "google" = "local") {
  const normalizedEmail = normalizeEmail(email);
  const existing = findLocalUser(normalizedEmail);
  if (existing) {
    if (existing.provider === "google" && provider === "local") {
      throw new Error("An account already exists with this email through Google. Use Google login.");
    }
    if (existing.provider === "local") {
      throw new Error("An account already exists with this email. Please login instead.");
    }
  }

  const user: LocalSavedUser = {
    email: normalizedEmail,
    password,
    name: deriveNameFromEmail(normalizedEmail),
    provider,
    createdAt: new Date().toISOString(),
  };

  const users = readLocalUsers().filter((item) => item.email !== normalizedEmail);
  writeLocalUsers([...users, user]);
  return user;
}

export function signInLocalUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const existing = findLocalUser(normalizedEmail);
  if (existing) {
    if (existing.provider === "google") {
      throw new Error("This account uses Google login. Please sign in with Google.");
    }
    if (existing.password !== password) {
      throw new Error("Incorrect email or password.");
    }
    const signedIn = signInDemoUser({
      email: normalizedEmail,
      name: existing.name,
      plan: "free",
      referralCode: "LOCAL01",
    });
    return signedIn;
  }

  const user = registerLocalUser(normalizedEmail, password, "local");
  return signInDemoUser({
    email: user.email,
    name: user.name,
    plan: "free",
    referralCode: "LOCAL01",
  });
}

export function signInLocalGoogleUser(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const existing = findLocalUser(normalizedEmail);
  if (existing && existing.provider === "local") {
    throw new Error("An account already exists for this email. Use email/password login instead.");
  }

  const user = existing ?? registerLocalUser(normalizedEmail, "", "google");

  return signInDemoUser({
    email: user.email,
    name: user.name,
    plan: "free",
    referralCode: "GOOGLE01",
  });
}
