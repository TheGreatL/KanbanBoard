ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS joined_via_link_id UUID REFERENCES public.project_share_links(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION redeem_share_link(share_token UUID)
RETURNS JSON AS $$
DECLARE
  v_project_id UUID;
  v_role TEXT;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Look up the token
  SELECT project_id, role INTO v_project_id, v_role
  FROM public.project_share_links
  WHERE id = share_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or revoked share link';
  END IF;

  -- Ensure the user has a profile (sometimes anonymous auth misses the trigger)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    INSERT INTO public.profiles (id, username)
    VALUES (v_user_id, 'anon_' || substr(v_user_id::text, 1, 8))
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Insert or update project_members
  -- Using DO NOTHING to avoid accidentally downgrading an existing member (e.g. owner to viewer)
  INSERT INTO public.project_members (project_id, user_id, role, joined_via_link_id)
  VALUES (v_project_id, v_user_id, v_role, share_token)
  ON CONFLICT (project_id, user_id) 
  DO NOTHING;
  
  RETURN json_build_object('success', true, 'project_id', v_project_id, 'role', v_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
