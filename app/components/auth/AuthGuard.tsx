import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "~/hooks/useAuth";

type AuthGuardProps = {
  children: ReactNode;
  requireAdmin?: boolean;
};

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p style={{ padding: "2rem", textAlign: "center" }}>Oturum doğrulanıyor...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
