import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { getDefaultAdminPath } from "../utils/adminAccess";

export default function AdminHomeRedirect() {
  const { user } = useAuth();

  return <Navigate to={getDefaultAdminPath(user)} replace />;
}
