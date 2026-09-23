"use client";
import { useState } from "react";
export function AccountAuth({ email }: { email?: string | null }) {
  const [mode, setMode] = useState(email ? "password" : "login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [recovery, setRecovery] = useState(""),
    [saved, setSaved] = useState(false);
  if (recovery)
    return (
      <section className="account-auth" aria-labelledby="recovery-heading">
        <h2 id="recovery-heading">Save your recovery code</h2>
        <p>
          This code can reset your password. Store it somewhere private, such as
          your password manager. This is the only time we show it.
        </p>
        <code className="recovery-code">{recovery}</code>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
          />
          I have saved my recovery code
        </label>
        <button
          className="button primary"
          disabled={!saved}
          onClick={() => window.location.reload()}
        >
          Continue to my account
        </button>
      </section>
    );
  const title =
    mode === "register"
      ? "Create your account"
      : mode === "recover"
        ? "Recover your account"
        : mode === "password"
          ? "Change password"
          : "Sign in to GTA VI Hub";
  return (
    <section className="account-auth" aria-labelledby="auth-heading">
      <h2 id="auth-heading">{title}</h2>
      <p>
        {mode === "recover"
          ? "Enter the recovery code you saved when you created your account."
          : mode === "register"
            ? "Your own account. Your discoveries, available on every device."
            : mode === "password"
              ? "Changing your password signs out your other devices and replaces your recovery code."
              : "Welcome back. Pick up where you left off."}
      </p>
      <form
        key={mode}
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          const form = new FormData(e.currentTarget);
          if (
            mode !== "login" &&
            form.get("password") !== form.get("confirm")
          ) {
            setError("The passwords do not match.");
            setBusy(false);
            return;
          }
          try {
            const r = await fetch("/api/auth/local", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: mode,
                email: email || form.get("email"),
                password: form.get("password"),
                username: form.get("username") || undefined,
                current_password: form.get("current_password") || undefined,
                recovery: form.get("recovery") || undefined,
              }),
            });
            const data = await r.json();
            if (!r.ok)
              throw Error(data.error || "Could not complete your request.");
            if (data.recovery) setRecovery(data.recovery);
            else window.location.reload();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          {mode === "register" && (
            <label>
              Display name
              <input
                name="username"
                autoComplete="nickname"
                required
                minLength={2}
                maxLength={80}
              />
            </label>
          )}
          {!email && (
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
              />
            </label>
          )}
          {mode === "password" && (
            <label>
              Current password
              <input
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
          )}
          {mode === "recover" && (
            <label>
              Recovery code
              <input
                name="recovery"
                autoComplete="off"
                spellCheck={false}
                required
                maxLength={128}
              />
            </label>
          )}
          <label>
            {mode === "login" ? "Password" : "New password"}
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
            />
            {mode !== "login" && (
              <small>
                Use 12–128 characters. A long, unique passphrase works well.
              </small>
            )}
          </label>
          {mode !== "login" && (
            <label>
              Confirm password
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </label>
          )}
          <button className="button primary" type="submit">
            {busy
              ? "Please wait…"
              : mode === "register"
                ? "Create account"
                : mode === "recover"
                  ? "Reset password"
                  : mode === "password"
                    ? "Update password"
                    : "Sign in"}
          </button>
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="form-message">
          {error}
        </p>
      )}
      {!email && (
        <div className="account-auth-links">
          {mode !== "login" && (
            <button
              disabled={busy}
              className="text-link"
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Back to sign in
            </button>
          )}
          {mode !== "register" && (
            <button
              disabled={busy}
              className="text-link"
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Create an account
            </button>
          )}
          {mode === "login" && (
            <button
              disabled={busy}
              className="text-link"
              onClick={() => {
                setMode("recover");
                setError("");
              }}
            >
              Forgot password?
            </button>
          )}
        </div>
      )}
    </section>
  );
}
