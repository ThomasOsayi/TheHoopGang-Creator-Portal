'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type UserRole = 'admin' | 'creator';

interface UserData {
  uid: string;
  email: string | null;
  role: UserRole;
  creatorId?: string; // Links to creators collection
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role?: UserRole, creatorDocId?: string) => Promise<string>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isCreator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        } else {
          // User exists in Auth but not Firestore - shouldn't happen normally
          setUserData(null);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (
    email: string,
    password: string,
    role: UserRole = 'creator',
    creatorDocId?: string
  ): Promise<string> => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user document in Firestore
    const newUserData: UserData = {
      uid: credential.user.uid,
      email: credential.user.email,
      role,
      creatorId: creatorDocId, // Link to creator document
    };
    
    await setDoc(doc(db, 'users', credential.user.uid), newUserData);
    setUserData(newUserData);
    
    return credential.user.uid; // Return the UID so we can use it
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserData(null);
  };

  const value: AuthContextType = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: userData?.role === 'admin',
    isCreator: userData?.role === 'creator',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

