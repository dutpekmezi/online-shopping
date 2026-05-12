import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import type { Route } from "./+types/register";
import authStylesHref from "./auth.css?url";
import { useAuth } from "~/hooks/useAuth";

export const links: Route.LinksFunction = () => [{ rel: "stylesheet", href: authStylesHref }];

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { registerWithEmail, clearError, errorMessage, loading, isAuthenticated } = useAuth();

  if (!loading && isAuthenticated) {
    return <Navigate to="/account" replace />;
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Register</h1>
        {localError ? <p className="auth-error">{localError}</p> : null}
        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            clearError();
            setLocalError(null);

            if (password !== confirmPassword) {
              setLocalError("Passwords must match.");
              return;
            }

            setSubmitting(true);

            try {
              await registerWithEmail(email, password);
              navigate("/account");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <label className="auth-field">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <label className="auth-field">
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <button className="auth-button" type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
