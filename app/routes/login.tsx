import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import type { Route } from "./+types/login";
import authStylesHref from "./auth.css?url";
import { useAuth } from "~/hooks/useAuth";

export const links: Route.LinksFunction = () => [{ rel: "stylesheet", href: authStylesHref }];

type LocationState = {
  from?: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithEmail, loginWithGoogle, clearError, errorMessage, isAuthenticated, loading } = useAuth();

  if (!loading && isAuthenticated) {
    const state = location.state as LocationState | null;
    return <Navigate to={state?.from ?? "/account"} replace />;
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Sign in</h1>
        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            clearError();

            try {
              await loginWithEmail(email, password);
              const state = location.state as LocationState | null;
              navigate(state?.from ?? "/account");
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
              autoComplete="current-password"
              minLength={6}
              required
            />
          </label>

          <button className="auth-button" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <button
          className="auth-button auth-button--google"
          type="button"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            clearError();

            try {
              await loginWithGoogle();
              navigate("/account");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          Continue with Google
        </button>

        <p className="auth-footer">
          Hesabın yok mu? <Link to="/register">Register</Link>
        </p>
      </section>
    </main>
  );
}
