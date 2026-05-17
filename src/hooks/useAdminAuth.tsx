import { useAuth } from "./useAuth";

export const useAdminAuth = () => {
  const { user, loading, isAdmin } = useAuth();

  return { isAdmin, loading, user };
};