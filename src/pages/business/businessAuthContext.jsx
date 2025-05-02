import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Adjust the path

const BusinessAuthContext = createContext();

export const BusinessAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session) {
          setCurrentUser({ id: session.user.id, email: session.user.email });
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error getting Supabase session:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setCurrentUser({ id: session.user.id, email: session.user.email });
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase login error:', error);
      throw error;
    }
  };

  const signup = async (email, password, businessInfo) => {
    try {
      // Sign up the user with Supabase
      const { data: { user }, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) throw signupError;

      if (!user) {
        throw new Error('User creation failed. No user returned.');
      }

      // Insert business info into business_profiles table
      const businessProfile = {
        user_id: user.id,
        business_name: businessInfo.businessName,
        industry: businessInfo.industry,
        location: businessInfo.location,
        website: businessInfo.website,
        linkedin: businessInfo.linkedin,
        instagram: businessInfo.instagram,
        twitter: businessInfo.twitter,
        business_size: businessInfo.businessSize,
        years_in_business: businessInfo.yearsInBusiness,
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('business_profiles')
        .insert(businessProfile);

      if (insertError) {
        console.error('Error inserting business profile:', insertError);
        // Optionally, delete the user if profile insertion fails
        await supabase.auth.admin.deleteUser(user.id);
        throw new Error('Failed to create business profile: ' + insertError.message);
      }

      return user;
    } catch (error) {
      console.error('Supabase signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Supabase logout error:', error);
      throw error;
    }
  };

  return (
    <BusinessAuthContext.Provider value={{ currentUser, login, signup, logout, loading }}>
      {children}
    </BusinessAuthContext.Provider>
  );
};

export const useBusinessAuth = () => useContext(BusinessAuthContext);