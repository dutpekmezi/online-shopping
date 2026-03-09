import {
  type ReactNode,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "~/lib/firebase.client";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  errorMessage: string | null;
  clearError: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshClaims: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "Beklenmeyen bir kimlik doğrulama hatası oluştu.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshClaims = useCallback(async () => {
    if (!auth.currentUser) {
      setIsAdmin(false);
      return;
    }

    const idTokenResult = await auth.currentUser.getIdTokenResult(true);
    setIsAdmin(Boolean(idTokenResult.claims.admin));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);

      if (currentUser) {
        const idTokenResult = await currentUser.getIdTokenResult();
        setIsAdmin(Boolean(idTokenResult.claims.admin));
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const clearError = useCallback(() => setErrorMessage(null), []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setErrorMessage(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
      throw error;
    }
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string) => {
    setErrorMessage(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
      throw error;
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setErrorMessage(null);
    try {
      await signOut(auth);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin,
      errorMessage,
      clearError,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      logout,
      refreshClaims,
    }),
    [
      user,
      loading,
      isAdmin,
      errorMessage,
      clearError,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      logout,
      refreshClaims,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
