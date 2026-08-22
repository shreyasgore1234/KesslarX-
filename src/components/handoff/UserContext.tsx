// ============================================================
// KesslerX User Context
// Simple user-switching for demo purposes.
// Provides currentUser and setCurrentUser across the app.
// ============================================================

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { HandoffUser } from '../../data/handoffTypes';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface UserContextType {
  currentUser: HandoffUser | null;
  allUsers: HandoffUser[];
  setCurrentUser: (user: HandoffUser) => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  currentUser: null,
  allUsers: [],
  setCurrentUser: () => {},
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<HandoffUser | null>(null);
  const [allUsers, setAllUsers] = useState<HandoffUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch(`${API}/api/users`);
        const data = await res.json();
        const users: HandoffUser[] = data.users || [];
        setAllUsers(users);

        // Default to Anish
        const savedId = localStorage.getItem('kesslerx_current_user');
        const defaultUser = users.find(u => u.user_id === (savedId || 'anish')) || users[0];
        if (defaultUser) setCurrentUser(defaultUser);
      } catch (err) {
        console.warn('Failed to load users, using fallback');
        const fallback: HandoffUser = {
          user_id: 'anish',
          name: 'Anish',
          role: 'Flight Dynamics Analyst',
          status: 'Available',
          avatar_initials: 'AN',
        };
        setAllUsers([fallback]);
        setCurrentUser(fallback);
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
