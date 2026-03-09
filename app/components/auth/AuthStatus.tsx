import { Link, useNavigate } from "react-router";
import { useAuth } from "~/hooks/useAuth";

export function AuthStatus() {
  const navigate = useNavigate();
  const { user, isAdmin, loading, logout } = useAuth();

  if (loading) {
    return <span className="navbar__auth-loading">...</span>;
  }

  if (!user) {
    return (
      <Link to="/login" className="navbar__auth-link">
        Sign in
      </Link>
    );
  }

  return (
    <div className="navbar__auth-menu">
      <Link to="/account" className="navbar__auth-link">
        {user.email}
      </Link>
      {isAdmin ? (
        <Link to="/admin" className="navbar__auth-link">
          Admin
        </Link>
      ) : null}
      <button
        type="button"
        className="navbar__auth-button"
        onClick={async () => {
          await logout();
          navigate("/login");
        }}
      >
        Çıkış
      </button>
    </div>
  );
}
