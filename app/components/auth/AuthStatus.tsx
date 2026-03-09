import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "~/hooks/useAuth";

export function AuthStatus() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  if (loading) {
    return <span className="navbar__auth-loading">...</span>;
  }

  return (
    <div className="navbar__profile" ref={menuRef}>
      <button
        type="button"
        aria-label="Profile"
        aria-expanded={isOpen}
        className="navbar__icon-button"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        👤
      </button>

      {isOpen ? (
        <div className="navbar__profile-menu" role="menu" aria-label="Profile menu">
          {user ? (
            <>
              <Link to="/account" className="navbar__profile-item" role="menuitem" onClick={() => setIsOpen(false)}>
                Account
              </Link>
              <button
                type="button"
                className="navbar__profile-item navbar__profile-button"
                role="menuitem"
                onClick={async () => {
                  await logout();
                  setIsOpen(false);
                  navigate("/login");
                }}
              >
                Exit
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar__profile-item" role="menuitem" onClick={() => setIsOpen(false)}>
                Log In
              </Link>
              <Link to="/register" className="navbar__profile-item" role="menuitem" onClick={() => setIsOpen(false)}>
                Sign In
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
