import { FormEvent, useEffect, useState } from "react";
import { api } from "./api";
import type { UserProfile } from "./types";

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong.";

type Theme = "light" | "dark";

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("dot-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* storage unavailable */ }
  return "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("dot-theme", theme); } catch { /* storage unavailable */ }
}

type Tab = "profile" | "security" | "billing" | "app";

function Avatar({ name }: { name?: string }) {
  const initials = (name || "?").split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return <span className="set-avatar">{initials || "?"}</span>;
}

function ProfileTab({ profile, onProfileUpdate }: { profile: UserProfile | null; onProfileUpdate: (u: UserProfile) => void }) {
  const [name, setName] = useState(profile?.name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordErr, setPasswordErr] = useState("");

  useEffect(() => { setName(profile?.name ?? ""); setEmail(profile?.email ?? ""); }, [profile]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true); setProfileErr(""); setProfileMsg("");
    try {
      const body: { name?: string; email?: string } = {};
      if (name !== profile?.name) body.name = name;
      if (email !== profile?.email) body.email = email;
      if (Object.keys(body).length) {
        const result = await api.updateProfile(body);
        onProfileUpdate(result.user);
      }
      setProfileMsg("Saved");
      setTimeout(() => setProfileMsg(""), 2000);
    } catch (error) { setProfileErr(errorMessage(error)); }
    finally { setSavingProfile(false); }
  };

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordErr(""); setPasswordMsg("");
    if (newPassword !== confirmPassword) { setPasswordErr("New passwords don't match."); return; }
    setSavingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordMsg("Password updated");
      setTimeout(() => setPasswordMsg(""), 2000);
    } catch (error) { setPasswordErr(errorMessage(error)); }
    finally { setSavingPassword(false); }
  };

  return <div className="set-panels">
    <div className="set-card">
      <div className="set-card-head">
        <Avatar name={profile?.name} />
        <div className="set-card-head-meta">
          <div className="set-card-name">{profile?.name || "…"}</div>
          <div className="set-card-sub">{profile?.email || ""} · Free plan</div>
        </div>
        <button type="button" className="outline set-photo-btn" disabled title="Not available yet">Change photo</button>
      </div>
    </div>
    <form className="set-card" onSubmit={saveProfile}>
      <span className="eyebrow mono">Identity</span>
      <div className="set-grid-2">
        <label><span>Display name</span><input value={name} onChange={e => setName(e.target.value)} maxLength={100} required /></label>
        <label><span>Email address</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      </div>
      <div className="set-card-actions">
        <button className="primary" disabled={savingProfile}>{savingProfile ? "Saving…" : profileMsg || "Save changes"}</button>
        <span className="set-hint">Changing your email requires re-verification.</span>
      </div>
      {profileErr && <p className="error">{profileErr}</p>}
    </form>
    <form className="set-card" onSubmit={savePassword}>
      <span className="eyebrow mono">Password</span>
      <div className="set-grid-3">
        <label><span>Current</span><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" required minLength={8} /></label>
        <label><span>New password</span><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} /></label>
        <label><span>Confirm</span><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" required minLength={8} /></label>
      </div>
      <button className="outline" disabled={savingPassword}>{savingPassword ? "Updating…" : passwordMsg || "Update password"}</button>
      {passwordErr && <p className="error">{passwordErr}</p>}
    </form>
  </div>;
}

function SecurityTab() {
  return <div className="set-panels">
    <div className="set-card">
      <div className="set-2fa-row">
        <div>
          <span className="eyebrow mono">Two-factor authentication</span>
          <h3>Authenticator app</h3>
          <p>Require a 6-digit code from your authenticator app when signing in on a new device.</p>
        </div>
        <button type="button" className="set-toggle" disabled title="Coming soon" aria-label="Two-factor authentication (coming soon)"><span className="set-toggle-knob" /></button>
      </div>
      <p className="set-coming-soon">Coming soon — two-factor authentication isn't available yet.</p>
    </div>
    <div className="set-card">
      <span className="eyebrow mono">Active sessions</span>
      <div className="set-sessions">
        <div className="set-session-row">
          <span><strong>This device</strong><span>Current session</span></span>
          <span className="set-session-current">Current</span>
        </div>
      </div>
      <p className="set-coming-soon">Coming soon — tracking and revoking sessions on other devices isn't available yet.</p>
    </div>
  </div>;
}

function BillingTab() {
  return <div className="set-panels">
    <div className="set-card">
      <div className="set-billing-row">
        <div>
          <span className="eyebrow mono">Current plan</span>
          <h3>Quiet · Free</h3>
          <p>Full access to timer, flashcards, notes, and countdowns.</p>
        </div>
        <button type="button" className="primary" disabled title="Coming soon">Upgrade</button>
      </div>
    </div>
    <div className="set-card">
      <span className="eyebrow mono">Payment method</span>
      <div className="set-payment-row">
        <span className="set-card-chip" />
        <span><strong>No card on file</strong><span>Add one only when you upgrade.</span></span>
      </div>
    </div>
    <div className="set-card">
      <span className="eyebrow mono">Invoices</span>
      <p className="set-coming-soon">Nothing yet — invoices appear here after your first payment.</p>
    </div>
  </div>;
}

function AppTab() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const setTheme = (next: Theme) => { applyTheme(next); setThemeState(next); };
  return <div className="set-panels">
    <div className="set-card">
      <span className="eyebrow mono">Appearance</span>
      <h3>Theme</h3>
      <p>Pitch-black for late nights, soft light for daytime. Your choice is remembered on this device.</p>
      <div className="set-theme-grid">
        <button type="button" className={theme === "light" ? "set-theme-card active" : "set-theme-card"} onClick={() => setTheme("light")}>
          <span className="set-theme-swatch light" />
          <span className="set-theme-label"><span>Light</span><span className="set-theme-status">{theme === "light" ? "ACTIVE" : "SELECT"}</span></span>
        </button>
        <button type="button" className={theme === "dark" ? "set-theme-card active" : "set-theme-card"} onClick={() => setTheme("dark")}>
          <span className="set-theme-swatch dark" />
          <span className="set-theme-label"><span>Dark</span><span className="set-theme-status">{theme === "dark" ? "ACTIVE" : "SELECT"}</span></span>
        </button>
      </div>
    </div>
    <div className="set-card muted">
      <span className="eyebrow mono">Coming soon</span>
      <p>Notifications, default cycle length, keyboard shortcuts and data export will live here.</p>
    </div>
  </div>;
}

export default function SettingsView({ profile, onProfileUpdate }: {
  profile: UserProfile | null;
  onProfileUpdate: (u: UserProfile) => void;
  onSignOut: () => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("profile");
  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "security", label: "Security" },
    { id: "billing", label: "Billing" },
    { id: "app", label: "App" },
  ];
  return <section className="set-page">
    <span className="eyebrow mono">Account</span>
    <h1>Settings</h1>
    <p className="set-lede">Your profile, security, billing and how the app behaves.</p>
    <div className="set-tabs">
      {tabs.map(t => <button key={t.id} type="button" className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>{t.label}</button>)}
    </div>
    {tab === "profile" && <ProfileTab profile={profile} onProfileUpdate={onProfileUpdate} />}
    {tab === "security" && <SecurityTab />}
    {tab === "billing" && <BillingTab />}
    {tab === "app" && <AppTab />}
  </section>;
}
