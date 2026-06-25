import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import {
  ArrowLeft,
  CreditCard,
  Globe,
  Landmark,
  LayoutDashboard,
  LogIn,
  LogOut,
  Shield,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { DemoSignInButton, SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { cn } from "@/lib/utils.ts";

type PayoutMethod = "bank" | "mobile_money" | "paypal";

function ProfileSettingsInner() {
  const navigate = useNavigate();
  const {
    isDemoAuthenticated,
    user: demoUser,
    updateUser,
    signOut,
  } = useDemoAuth();
  const userQuery = useQuery(
    api.users.getCurrentUser,
    isDemoAuthenticated ? "skip" : {},
  );
  const updateProfile = useMutation(api.users.updateProfile);
  const updatePayoutSetup = useMutation(api.users.updatePayoutSetup);
  const deleteCurrentAccount = useMutation(api.users.deleteCurrentAccount);
  const { removeUser } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [method, setMethod] = useState<PayoutMethod>("bank");
  const [accountName, setAccountName] = useState("");
  const [payoutCountry, setPayoutCountry] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState("");
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [savingPayout, setSavingPayout] = useState(false);

  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const user = demoUser ?? userQuery;
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
    setCountry(user.country ?? "");
    setMethod(user.payoutSetup?.method ?? "bank");
    setAccountName(user.payoutSetup?.accountName ?? user.name ?? "");
    setPayoutCountry(user.payoutSetup?.country ?? user.country ?? "");
    setBankName(user.payoutSetup?.bankName ?? "");
    setMobileMoneyProvider(user.payoutSetup?.mobileMoneyProvider ?? "");
    setPaypalEmail(user.payoutSetup?.paypalEmail ?? user.email ?? "");
  }, [demoUser, userQuery]);

  if (!isDemoAuthenticated && userQuery === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const user = demoUser ?? userQuery;

  if (!user) {
    return null;
  }

  const saveProfile = async () => {
    if (!name.trim() || !email.includes("@")) {
      toast.error("Enter your name and a valid email.");
      return;
    }

    setSavingProfile(true);
    try {
      if (isDemoAuthenticated) {
        updateUser({
          name: name.trim(),
          email: email.trim(),
          phone: phone || undefined,
          country: country || undefined,
        });
        toast.success("Demo profile updated.");
        return;
      }

      await updateProfile({
        name,
        email,
        phone: phone || undefined,
        country: country || undefined,
      });
      toast.success("Profile updated.");
    } catch {
      toast.error("Could not update your profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePayout = async () => {
    setSavingPayout(true);
    try {
      if (isDemoAuthenticated) {
        const accountNumberDigits = accountNumber.replace(/\D/g, "");
        const mobileDigits = mobileMoneyNumber.replace(/\D/g, "");
        updateUser({
          payoutSetup: {
            method,
            accountName,
            country: payoutCountry,
            bankName: bankName || undefined,
            accountNumberLast4:
              accountNumberDigits.slice(-4) ||
              user.payoutSetup?.accountNumberLast4,
            mobileMoneyProvider: mobileMoneyProvider || undefined,
            mobileMoneyLast4:
              mobileDigits.slice(-4) || user.payoutSetup?.mobileMoneyLast4,
            paypalEmail: paypalEmail || undefined,
            updatedAt: new Date().toISOString(),
          },
        });
        setAccountNumber("");
        setMobileMoneyNumber("");
        toast.success("Demo payout setup saved.");
        return;
      }

      await updatePayoutSetup({
        method,
        accountName,
        country: payoutCountry,
        bankName: bankName || undefined,
        accountNumber: accountNumber || undefined,
        mobileMoneyProvider: mobileMoneyProvider || undefined,
        mobileMoneyNumber: mobileMoneyNumber || undefined,
        paypalEmail: paypalEmail || undefined,
      });
      setAccountNumber("");
      setMobileMoneyNumber("");
      toast.success("Payout setup saved.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save payout setup.";
      toast.error(message);
    } finally {
      setSavingPayout(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      if (isDemoAuthenticated) {
        signOut();
        localStorage.removeItem("vc_onboarded");
        toast.success("Demo account cleared.");
        navigate("/", { replace: true });
        return;
      }

      await deleteCurrentAccount({ confirmEmail: deleteEmail });
      await removeUser();
      localStorage.removeItem("vc_onboarded");
      toast.success("Your account has been deleted.");
      navigate("/", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not delete your account.";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <UserRound className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-primary">Personal details</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Full name
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Phone
            </label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Country
            </label>
            <input
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex justify-end mt-5">
          <Button
            className="cursor-pointer"
            disabled={savingProfile}
            onClick={() => {
              void saveProfile();
            }}
          >
            {savingProfile ? "Saving..." : "Save details"}
          </Button>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <GiftCodeIcon />
            <h2 className="font-semibold text-primary">Referral code</h2>
          </div>
          <div className="font-mono text-lg font-semibold text-foreground tracking-wide">
            {user.referralCode ?? "Generating..."}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this code with applicants. They get a discount at checkout.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-primary">Payment method</h2>
          </div>
          {user.paymentMethod ? (
            <div>
              <div className="text-sm font-semibold text-foreground">
                {user.paymentMethod.brand ?? "Card"} ending{" "}
                {user.paymentMethod.last4}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {user.paymentMethod.nameOnMethod} ·{" "}
                {user.paymentMethod.expiresAt}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No payment method saved.
            </p>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="mt-4 cursor-pointer"
            onClick={() => {
              const plan = user.plan === "expert" ? "expert" : "pro";
              const billing = user.billingCycle ?? "yearly";
              navigate(`/payment?plan=${plan}&billing=${billing}`);
            }}
          >
            Update payment
          </Button>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Wallet className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-primary">Payout setup</h2>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { id: "bank", label: "Bank" },
            { id: "mobile_money", label: "Mobile" },
            { id: "paypal", label: "PayPal" },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setMethod(option.id as PayoutMethod)}
              className={cn(
                "py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                method === option.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:text-primary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Account name
            </label>
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Country
            </label>
            <input
              value={payoutCountry}
              onChange={(event) => setPayoutCountry(event.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {method === "bank" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Bank name
                </label>
                <input
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Account number
                </label>
                <input
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  placeholder={
                    user.payoutSetup?.accountNumberLast4
                      ? `•••• ${user.payoutSetup.accountNumberLast4}`
                      : ""
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}

          {method === "mobile_money" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Provider
                </label>
                <input
                  value={mobileMoneyProvider}
                  onChange={(event) =>
                    setMobileMoneyProvider(event.target.value)
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Mobile money number
                </label>
                <input
                  inputMode="tel"
                  value={mobileMoneyNumber}
                  onChange={(event) => setMobileMoneyNumber(event.target.value)}
                  placeholder={
                    user.payoutSetup?.mobileMoneyLast4
                      ? `•••• ${user.payoutSetup.mobileMoneyLast4}`
                      : ""
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}

          {method === "paypal" && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                PayPal email
              </label>
              <input
                type="email"
                value={paypalEmail}
                onChange={(event) => setPaypalEmail(event.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end mt-5">
          <Button
            className="cursor-pointer"
            disabled={savingPayout}
            onClick={() => {
              void savePayout();
            }}
          >
            {savingPayout ? "Saving..." : "Save payout setup"}
          </Button>
        </div>
      </section>

      <section className="bg-destructive/5 border border-destructive/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h2 className="font-semibold text-destructive">Delete account</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          This removes your profile, saved checklists, reminders, rejection
          analyses, and agent profile.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={deleteEmail}
            onChange={(event) => setDeleteEmail(event.target.value)}
            placeholder={user.email ?? "Confirm your email"}
            className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            variant="destructive"
            className="cursor-pointer"
            disabled={deleting}
            onClick={() => {
              void deleteAccount();
            }}
          >
            {deleting ? "Deleting..." : "Delete account"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function GiftCodeIcon() {
  return <Landmark className="w-5 h-5 text-primary" />;
}

export default function ProfileSettingsPage() {
  useSeo({
    title: "Profile Settings",
    description:
      "Manage your VisaClear profile, payment method, payout setup, and account deletion.",
  });
  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");
  const { isDemoAuthenticated, signOut } = useDemoAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold text-primary">
                  VisaClear
                </span>
                <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">
                  by Vericore
                </span>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Shield className="w-3.5 h-3.5 text-accent" />
              Profile Settings
            </div>
            {isDemoAuthenticated && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                  title="My Dashboard"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">My Dashboard</span>
                </button>
                <button
                  onClick={() => {
                    signOut();
                    navigate("/");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer border border-transparent hover:border-destructive/20"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {!isDemoAuthenticated && (
          <AuthLoading>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl" />
              ))}
            </div>
          </AuthLoading>
        )}
        {!isDemoAuthenticated && (
          <Unauthenticated>
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
                <LogIn className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-serif text-3xl font-semibold text-primary mb-3">
                Sign In to Manage Your Profile
              </h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                Update your details, payout setup, payment method, and account
                status.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <SignInButton
                  size="lg"
                  className="cursor-pointer font-semibold px-8"
                />
                <DemoSignInButton
                  size="lg"
                  className="cursor-pointer font-semibold px-8"
                  redirectTo="/settings/profile"
                />
              </div>
            </div>
          </Unauthenticated>
        )}
        {isDemoAuthenticated ? (
          <ProfileSettingsInner />
        ) : (
          <Authenticated>
            <ProfileSettingsInner />
          </Authenticated>
        )}
      </main>
    </div>
  );
}
