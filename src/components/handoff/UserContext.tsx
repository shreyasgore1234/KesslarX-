// ============================================================
// KesslerX User Context
// Simple user-switching for demo purposes.
// Provides currentUser and setCurrentUser across the app.
// ============================================================

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type HandoffUser, DEFAULT_DEMO_USERS } from '../../data/handoffTypes';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface UserContextType {
  currentUser: HandoffUser;
  allUsers: HandoffUser[];
  setCurrentUser: (user: HandoffUser) => void;
  loading: boolean;
}

const getInitialUser = (users: HandoffUser[]): HandoffUser => {
  const savedId = typeof window !== 'undefined' ? localStorage.getItem('kesslerx_current_user') : null;
  return users.find(u => u.user_id === (savedId || 'anish')) || users[0] || DEFAULT_DEMO_USERS[0];
};

const UserContext = createContext<UserContextType>({
  currentUser: DEFAULT_DEMO_USERS[0],
  allUsers: DEFAULT_DEMO_USERS,
  setCurrentUser: () => {},
  loading: false,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [allUsers, setAllUsers] = useState<HandoffUser[]>(DEFAULT_DEMO_USERS);
  const [currentUser, setCurrentUser] = useState<HandoffUser>(() => getInitialUser(DEFAULT_DEMO_USERS));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch(`${API}/api/users`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data.users) && data.users.length > 0) {
          setAllUsers(data.users);
          const savedId = localStorage.getItem('kesslerx_current_user');
          const defaultUser = data.users.find((u: HandoffUser) => u.user_id === (savedId || currentUser.user_id)) || data.users[0];
          if (defaultUser) setCurrentUser(defaultUser);
        }
      } catch (err) {
        console.warn('Backend users API not ready, using default demo users:', err);
        setAllUsers(DEFAULT_DEMO_USERS);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const handleSetUser = (user: HandoffUser) => {
    setCurrentUser(user);
    localStorage.setItem('kesslerx_current_user', user.user_id);
  };

  return (
    <UserContext.Provider value={{ currentUser, allUsers, setCurrentUser: handleSetUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
