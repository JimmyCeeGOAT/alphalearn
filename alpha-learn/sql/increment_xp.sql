-- ── XP increment helper (add to schema.sql or run separately) ────────────
-- Called from the /api/grade route to award XP atomically.

create or replace function public.increment_xp(user_id uuid, amount integer)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    xp          = xp + amount,
    last_active = current_date,
    streak_days = case
      when last_active = current_date - 1 then streak_days + 1
      when last_active = current_date     then streak_days
      else 1
    end
  where id = user_id;
end;
$$;
