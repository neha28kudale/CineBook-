-- Add theatre_id to user_roles table
ALTER TABLE public.user_roles
  ADD COLUMN theatre_id uuid REFERENCES public.theatres(id) ON DELETE SET NULL;

-- Add check constraint: theatre_admin must have theatre_id, others must not
ALTER TABLE public.user_roles
  ADD CONSTRAINT theatre_admin_must_have_theatre
  CHECK (
    (role = 'theatre_admin' AND theatre_id IS NOT NULL) OR
    (role != 'theatre_admin' AND theatre_id IS NULL)
  );

-- Create SQL function to get a user's managed theatre ID
CREATE OR REPLACE FUNCTION get_managed_theatre_id(_user_id uuid)
RETURNS uuid AS $$
  SELECT theatre_id FROM public.user_roles
  WHERE user_id = _user_id AND role = 'theatre_admin'
  LIMIT 1;
$$ LANGUAGE SQL STABLE;
