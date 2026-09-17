import { useEffect, useState } from "react";
import { getMeRequest, loginRequest, logoutRequest } from "../api/authApi";
import { AuthContext } from "./authContextValue";
import {
  clearAuthStorage,
  getRefreshToken,
  getStoredUser,
  hasAccessToken,
  saveTokens,
  saveUser,
} from "../utils/authStorage";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loadingAuth, setLoadingAuth] = useState(() => hasAccessToken());

  async function login(username, password) {
    const data = await loginRequest({ username, password });

    saveTokens({
      access: data.access,
      refresh: data.refresh,
    });

    const loggedUser = data.user ? data.user : await getMeRequest();

    saveUser(loggedUser);
    setUser(loggedUser);

    return loggedUser;
  }

  async function logout() {
    try {
      const refreshToken = getRefreshToken();

      if (refreshToken) {
        await logoutRequest(refreshToken);
      }
    } catch {
      // Aunque el backend falle al cerrar sesión, limpiamos la sesión local.
    } finally {
      clearAuthStorage();
      setUser(null);
    }
  }

  function hasRole(allowedRoles = []) {
    if (!user) {
      return false;
    }

    if (user.is_superuser) {
      return true;
    }

    if (!Array.isArray(user.roles)) {
      return false;
    }

    return user.roles.some((role) => allowedRoles.includes(role));
  }

  function hasPermission(requiredPermissions = []) {
    if (!user) {
      return false;
    }

    if (user.is_superuser) {
      return true;
    }

    if (!Array.isArray(user.permissions)) {
      return false;
    }

    return requiredPermissions.some((permission) =>
      user.permissions.includes(permission),
    );
  }

  useEffect(() => {
    if (!hasAccessToken()) {
      return undefined;
    }

    let ignore = false;

    async function loadCurrentUser() {
      try {
        const currentUser = await getMeRequest();

        if (!ignore) {
          saveUser(currentUser);
          setUser(currentUser);
        }
      } catch {
        if (!ignore) {
          clearAuthStorage();
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setLoadingAuth(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loadingAuth,
        isAuthenticated: Boolean(user),
        login,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}