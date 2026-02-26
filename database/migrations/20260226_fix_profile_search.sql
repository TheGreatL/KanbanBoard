-- Fix for profiles RLS to allow user search

-- Allow all authenticated users to view profiles (for searching/sharing)
DROP POLICY IF EXISTS "Users can view and manage their own profile" ON profiles;

CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Ensure profiles are searchable
-- (Implicitly covered by the SELECT policy, but good to keep in mind)
