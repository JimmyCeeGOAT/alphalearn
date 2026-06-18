-- ============================================================
-- ALPHA Learn — Supabase Schema + Full CAPS G12 Seed Data
-- Run this entire file in your Supabase SQL Editor.
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  xp            integer not null default 0,
  streak_days   integer not null default 0,
  last_active   date,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- ── Subject Marks (for APS calculator) ──────────────────────
create table if not exists public.subject_marks (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  subject    text not null,
  percentage integer not null check (percentage between 0 and 100),
  aps_points integer generated always as (
    case
      when percentage >= 90 then 7
      when percentage >= 80 then 6
      when percentage >= 70 then 5
      when percentage >= 60 then 4
      when percentage >= 50 then 3
      when percentage >= 40 then 2
      when percentage >= 30 then 1
      else 0
    end
  ) stored,
  updated_at timestamptz not null default now(),
  unique (user_id, subject)
);

alter table public.subject_marks enable row level security;

create policy "Users can manage own marks" on public.subject_marks
  for all using (auth.uid() = user_id);

-- ── Subjects & Topics (CAPS curriculum) ─────────────────────
create table if not exists public.subjects (
  id         uuid primary key default uuid_generate_v4(),
  slug       text unique not null,
  label      text not null,
  color_hex  text not null default '#3B82F6',
  bg_hex     text not null default '#EFF6FF'
);

create table if not exists public.topics (
  id                  uuid primary key default uuid_generate_v4(),
  subject_id          uuid not null references public.subjects(id) on delete cascade,
  slug                text unique not null,
  chapter             text not null,
  concept_name        text not null,
  concept_description text,
  caps_weight         integer not null default 3,
  youtube_id          text,
  notes_markdown      text,
  sort_order          integer not null default 0
);

create index on public.topics(subject_id);

-- ── Questions ────────────────────────────────────────────────
create table if not exists public.questions (
  id             uuid primary key default uuid_generate_v4(),
  topic_id       uuid not null references public.topics(id) on delete cascade,
  body           text not null,
  difficulty     text not null check (difficulty in ('easy','medium','hard')),
  total_marks    integer not null default 3,
  correct_answer text not null,
  keywords       text[] not null default '{}',
  marking_guide  jsonb not null default '[]'
);

create index on public.questions(topic_id);

-- ── User Progress ─────────────────────────────────────────────
create table if not exists public.topic_progress (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  topic_id      uuid not null references public.topics(id) on delete cascade,
  mastery_score integer not null default 0 check (mastery_score between 0 and 100),
  video_watched boolean not null default false,
  updated_at    timestamptz not null default now(),
  unique (user_id, topic_id)
);

alter table public.topic_progress enable row level security;

create policy "Users can manage own progress" on public.topic_progress
  for all using (auth.uid() = user_id);

-- ── Practice Attempts ────────────────────────────────────────
create table if not exists public.practice_attempts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  question_id     uuid not null references public.questions(id) on delete cascade,
  answer_text     text not null,
  marks_awarded   integer not null default 0,
  marks_available integer not null default 0,
  xp_earned       integer not null default 0,
  ai_feedback     jsonb,
  created_at      timestamptz not null default now()
);

alter table public.practice_attempts enable row level security;

create policy "Users can manage own attempts" on public.practice_attempts
  for all using (auth.uid() = user_id);

-- ── Trigger: auto-create profile on signup ───────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  -- Seed default subject marks for new users
  insert into public.subject_marks (user_id, subject, percentage) values
    (new.id, 'Mathematics', 65),
    (new.id, 'Physical Sciences', 62),
    (new.id, 'English HL', 70),
    (new.id, 'Afrikaans FAL', 60),
    (new.id, 'Life Sciences', 68),
    (new.id, 'Information Technology', 72),
    (new.id, 'Life Orientation', 80);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- SEED DATA — FULL GRADE 12 CAPS CURRICULUM
-- ============================================================

-- Subjects
insert into public.subjects (slug, label, color_hex, bg_hex) values
  ('mathematics',  'Mathematics',        '#3B82F6', '#EFF6FF'),
  ('physics',      'Physical Sciences',  '#8B5CF6', '#F5F3FF')
on conflict (slug) do nothing;

-- ── MATHEMATICS ─────────────────────────────────────────────

-- Helper: get subject id
do $$ declare math_id uuid; phys_id uuid;
begin
  select id into math_id from public.subjects where slug = 'mathematics';
  select id into phys_id from public.subjects where slug = 'physics';

  -- ── CHAPTER 1: Algebra, Equations & Inequalities ──
  insert into public.topics (subject_id, slug, chapter, concept_name, concept_description, caps_weight, youtube_id, sort_order) values
  (math_id, 'm-alg-1', 'Algebra & Equations', 'Quadratic Equations & Inequalities',
   'Solve quadratic equations by factorisation, completing the square, and the quadratic formula. Solve quadratic inequalities using the number line or parabola method.',
   5, 'pB017DUzmQU', 10),

  (math_id, 'm-alg-2', 'Algebra & Equations', 'Simultaneous Equations',
   'Solve a system of two equations, one linear and one quadratic, using substitution.',
   3, 'QqeBLPKGBRo', 20),

  (math_id, 'm-alg-3', 'Algebra & Equations', 'Nature of Roots',
   'Use the discriminant Δ = b²−4ac to determine the nature of roots: real & unequal, real & equal, or non-real.',
   3, 'T3x1yKe-POM', 30),

  -- ── CHAPTER 2: Functions & Graphs ──
  (math_id, 'm-func-1', 'Functions & Graphs', 'Parabola (Quadratic Function)',
   'Analyse and sketch f(x) = a(x−p)²+q: turning point, axis of symmetry, intercepts, domain and range.',
   5, '5SLMQL02KQM', 40),

  (math_id, 'm-func-2', 'Functions & Graphs', 'Hyperbola',
   'Analyse and sketch f(x) = a/(x−p)+q: asymptotes, intercepts, domain, range, and axis of symmetry.',
   4, 'jFYzHhKHCdk', 50),

  (math_id, 'm-func-3', 'Functions & Graphs', 'Exponential Function',
   'Analyse and sketch f(x) = ab^(x+p)+q and its inverse. Understand growth and decay.',
   4, 'Bx_nBWlf5DU', 60),

  (math_id, 'm-func-4', 'Functions & Graphs', 'Logarithmic Function',
   'Sketch and interpret f(x) = log_b(x) as the inverse of the exponential. Apply change-of-base and log laws.',
   4, 'zzu2POfYv0Y', 70),

  (math_id, 'm-func-5', 'Functions & Graphs', 'Inverses & Restrictions',
   'Determine and sketch the inverse of a function. Apply domain restrictions to ensure the inverse is also a function.',
   3, 'UgTgVAijzAY', 80),

  -- ── CHAPTER 3: Sequences & Series ──
  (math_id, 'm-seq-1', 'Sequences & Series', 'Arithmetic Sequences & Series',
   'Derive and apply the formulae: T_n = a+(n−1)d and S_n = n/2(2a+(n−1)d).',
   5, 'XZJdyPkebMA', 90),

  (math_id, 'm-seq-2', 'Sequences & Series', 'Geometric Sequences & Series',
   'Derive and apply T_n = ar^(n−1) and S_n = a(r^n−1)/(r−1). Understand convergence.',
   5, 'pXo0bG4iAZg', 100),

  (math_id, 'm-seq-3', 'Sequences & Series', 'Sigma Notation & Infinite Series',
   'Interpret and evaluate expressions in sigma notation. Calculate the sum to infinity S_∞ = a/(1−r) when |r|<1.',
   4, '5hLBxBBqMvM', 110),

  -- ── CHAPTER 4: Finance, Growth & Decay ──
  (math_id, 'm-fin-1', 'Finance, Growth & Decay', 'Simple & Compound Interest',
   'Apply A = P(1+in) and A = P(1+i)^n. Understand effective vs nominal rates and hire purchase.',
   4, 'nnZMTYiPAWQ', 120),

  (math_id, 'm-fin-2', 'Finance, Growth & Decay', 'Depreciation',
   'Apply straight-line A = P(1−in) and reducing-balance A = P(1−i)^n depreciation. Calculate book value.',
   3, 'GKsAdLAXH3g', 130),

  (math_id, 'm-fin-3', 'Finance, Growth & Decay', 'Annuities & Loans',
   'Use future value F = x[(1+i)^n−1]/i and present value P = x[1−(1+i)^(-n)]/i to solve investment and loan problems.',
   5, 'GhZp0qjxRxw', 140),

  -- ── CHAPTER 5: Differential Calculus ──
  (math_id, 'm-calc-1', 'Differential Calculus', 'Limits & Definition of Derivative',
   'Evaluate limits and apply the first principles definition f′(x) = lim[h→0] [f(x+h)−f(x)]/h.',
   4, '54_XRjHhZzQ', 150),

  (math_id, 'm-calc-2', 'Differential Calculus', 'Rules of Differentiation',
   'Apply the power rule, sum/difference rules to find derivatives of polynomials and algebraic expressions.',
   5, 'alUkVWVEP10', 160),

  (math_id, 'm-calc-3', 'Differential Calculus', 'Applications: Stationary Points & Graphs',
   'Find stationary points, determine their nature (max/min/inflection) using second derivative test, and sketch cubic graphs.',
   5, 'LSmcLIrLemA', 170),

  (math_id, 'm-calc-4', 'Differential Calculus', 'Optimisation & Rate of Change',
   'Solve optimisation problems (max volume, min cost, max profit) and interpret rate-of-change problems.',
   5, 'vxKpGBJPuGc', 180),

  -- ── CHAPTER 6: Analytical Geometry ──
  (math_id, 'm-anageo-1', 'Analytical Geometry', 'Distance, Midpoint & Gradient',
   'Apply distance formula, midpoint formula, and gradient formula. Use these to prove properties of polygons.',
   4, 'VuAprkFTzJc', 190),

  (math_id, 'm-anageo-2', 'Analytical Geometry', 'Equation of a Straight Line',
   'Derive and use y = mx+c and y−y₁ = m(x−x₁). Determine parallel, perpendicular, and collinear conditions.',
   4, 'MXV65i9g1Xo', 200),

  (math_id, 'm-anageo-3', 'Analytical Geometry', 'Circle (centre at origin)',
   'Use x²+y² = r² and (x−a)²+(y−b)² = r². Find tangent to circle, intersections, and related proofs.',
   5, 'aVwxzDHLnqw', 210),

  -- ── CHAPTER 7: Trigonometry ──
  (math_id, 'm-trig-1', 'Trigonometry', 'Trigonometric Ratios & Unit Circle',
   'Define sin, cos, tan in terms of the unit circle. Evaluate special angles (30°, 45°, 60°, 90°, 180°) without a calculator.',
   4, '1YHnMzmCleE', 220),

  (math_id, 'm-trig-2', 'Trigonometry', 'Reduction Formulae & Identities',
   'Apply reduction formulae for any angle. Prove and use sin²θ+cos²θ=1, tanθ=sinθ/cosθ, and co-function identities.',
   5, 'mhd9FXYdf4s', 230),

  (math_id, 'm-trig-3', 'Trigonometry', 'Compound & Double Angle Formulae',
   'Derive and apply compound angle expansions: sin(A±B), cos(A±B), cos2A, sin2A.',
   5, 'rq6PGt4OXAQ', 240),

  (math_id, 'm-trig-4', 'Trigonometry', 'Solving Trigonometric Equations',
   'Solve equations like 2sin(x+30°)=1 for a given interval. Apply general solution method.',
   5, 'GjLSdFNVRhQ', 250),

  (math_id, 'm-trig-5', 'Trigonometry', 'Sine, Cosine & Area Rules',
   'Apply the Sine Rule, Cosine Rule, and Area = ½absinC to solve 2D and 3D triangle problems.',
   5, 'KdcN9aK6bAg', 260),

  (math_id, 'm-trig-6', 'Trigonometry', 'Graphs of Trig Functions',
   'Sketch and analyse y=a·sin(bx+p)+q, y=a·cos(bx+p)+q, y=a·tan(bx+p)+q. Identify amplitude, period, and shifts.',
   4, 'Lk7AR5-xyzU', 270),

  -- ── CHAPTER 8: Euclidean Geometry ──
  (math_id, 'm-geo-1', 'Euclidean Geometry', 'Circle Theorems (Part 1)',
   'Prove and apply: angle at centre = 2× angle at circumference; angles in same segment equal; angle in semicircle = 90°.',
   5, 'FcWlX2pL3Dw', 280),

  (math_id, 'm-geo-2', 'Euclidean Geometry', 'Circle Theorems (Part 2)',
   'Prove and apply: cyclic quadrilateral opposite angles; tangent–radius perpendicularity; tan–chord angle = inscribed angle.',
   5, 'UZqRv3k3s38', 290),

  (math_id, 'm-geo-3', 'Euclidean Geometry', 'Similar Triangles & Proportionality',
   'Use the equiangular criterion to prove similarity. Apply the proportionality theorem and its converse (Midpoint Theorem).',
   5, 'x_MMWvQiJbI', 300),

  -- ── CHAPTER 9: Probability & Statistics ──
  (math_id, 'm-stat-1', 'Probability & Statistics', 'Counting Principles & Probability',
   'Apply the fundamental counting principle, permutations nPr and combinations nCr to calculate probabilities.',
   4, 'zzMiEJ-BQDA', 310),

  (math_id, 'm-stat-2', 'Probability & Statistics', 'Probability Rules & Venn Diagrams',
   'Apply P(A or B) = P(A)+P(B)−P(A and B). Use Venn diagrams, tree diagrams, and two-way contingency tables.',
   4, 'KzfWUEJjG18', 320),

  (math_id, 'm-stat-3', 'Probability & Statistics', 'Regression & Correlation',
   'Calculate and interpret the least-squares regression line. Use the correlation coefficient r to describe the relationship.',
   4, 'GAmzwIkGFgE', 330),

  (math_id, 'm-stat-4', 'Probability & Statistics', 'Ogives & Normal Distribution',
   'Draw and interpret cumulative frequency curves (ogives). Understand the normal distribution: mean, median, mode coincide.',
   3, 'rzFX5NWojp0', 340);

  -- ── PHYSICAL SCIENCES ───────────────────────────────────────

  -- ── PHYSICS: Mechanics ──
  insert into public.topics (subject_id, slug, chapter, concept_name, concept_description, caps_weight, youtube_id, sort_order) values
  (phys_id, 'p-mech-1', 'Mechanics', 'Newton''s Laws of Motion',
   'Apply Newton''s First, Second (F_net = ma), and Third Laws. Draw free-body diagrams and solve incline, Atwood, and friction problems.',
   5, 'fn_r7OMUBPM', 10),

  (phys_id, 'p-mech-2', 'Mechanics', 'Vertical Projectile Motion',
   'Analyse objects in free fall and upward projection under g = 9.8 m·s⁻². Use v=u+at, s=ut+½at², v²=u²+2as. Draw motion graphs.',
   5, 'hkXzhH2espw', 20),

  (phys_id, 'p-mech-3', 'Mechanics', 'Momentum & Impulse',
   'Define p = mv. Apply impulse-momentum theorem: F_net·Δt = Δp. Distinguish elastic and inelastic collisions. Apply conservation of momentum.',
   5, 'XFhntPxbQLs', 30),

  (phys_id, 'p-mech-4', 'Mechanics', 'Work, Energy & Power',
   'Define W = FΔxcosθ. Apply work-energy theorem: W_net = ΔKE. Apply conservation of mechanical energy and calculate power P = W/Δt.',
   5, 'zKHAGFZqzLI', 40),

  -- ── PHYSICS: Waves, Sound & Light ──
  (phys_id, 'p-wave-1', 'Waves, Sound & Light', 'Doppler Effect',
   'Explain observed frequency shift for moving source/observer. Apply f_L = v±v_L / v∓v_S × f_S. Use in ultrasound and astronomy contexts.',
   4, 'h4OnBYrbCjY', 50),

  (phys_id, 'p-wave-2', 'Waves, Sound & Light', 'Electromagnetic Spectrum',
   'Arrange the EM spectrum by wavelength and frequency. Describe practical applications from radio waves to gamma rays.',
   3, 'cfXzwh0KqPo', 60),

  -- ── PHYSICS: Electricity & Magnetism ──
  (phys_id, 'p-elec-1', 'Electricity & Magnetism', 'Electrostatics & Coulomb''s Law',
   'State and apply Coulomb''s Law F = kq₁q₂/r². Draw electric field patterns. Understand electric potential and field strength E = F/q.',
   5, 'DlSfLHaIjLs', 70),

  (phys_id, 'p-elec-2', 'Electricity & Magnetism', 'Electric Circuits',
   'Analyse series and parallel circuits using Ohm''s Law V=IR, Kirchhoff''s Voltage and Current Laws, and internal resistance ε = I(R+r).',
   5, 'vShcn5_ioGE', 80),

  (phys_id, 'p-elec-3', 'Electricity & Magnetism', 'Electrodynamics',
   'Explain electromagnetic induction (Faraday''s & Lenz''s Law). Describe AC generators, DC motors, and transformers V_p/V_s = N_p/N_s.',
   5, 'AGsplFEqHX8', 90),

  -- ── CHEMISTRY: Matter & Materials ──
  (phys_id, 'p-chem-1', 'Matter & Materials', 'Organic Chemistry: Naming & Structure',
   'Name and draw structural formulae of alkanes, alkenes, alkynes, alcohols, carboxylic acids, esters, and aldehydes using IUPAC rules.',
   5, 'q_0sflB1BQE', 100),

  (phys_id, 'p-chem-2', 'Matter & Materials', 'Organic Reactions',
   'Describe addition, substitution, elimination, condensation, and hydrolysis reactions. Write balanced equations for each.',
   5, 'Y7JGdxbY87c', 110),

  (phys_id, 'p-chem-3', 'Matter & Materials', 'Plastics & Polymers',
   'Distinguish addition and condensation polymerisation. Identify monomer units from a polymer structure. Discuss recyclability.',
   3, 'sFxvqGpF7UE', 120),

  -- ── CHEMISTRY: Chemical Change ──
  (phys_id, 'p-chem-4', 'Chemical Change', 'Chemical Equilibrium',
   'Apply Le Chatelier''s Principle to predict shifts in equilibrium. Write K_c expressions and interpret its magnitude.',
   5, 'jhoOhJDcXYo', 130),

  (phys_id, 'p-chem-5', 'Chemical Change', 'Rates of Reaction',
   'Identify factors affecting reaction rate (concentration, temperature, catalyst, surface area). Interpret rate vs time graphs.',
   4, 'pNmLJPG0LCM', 140),

  (phys_id, 'p-chem-6', 'Chemical Change', 'Acids & Bases',
   'Apply Brønsted-Lowry theory. Calculate pH = −log[H₃O⁺] and pOH. Understand K_w and acid-base neutralisation reactions.',
   5, 'HcmSa3zNKFU', 150),

  (phys_id, 'p-chem-7', 'Chemical Change', 'Electrochemical Cells',
   'Distinguish galvanic from electrolytic cells. Use the standard electrode potential table to predict cell reaction and calculate E°_cell.',
   5, 'MHpFhGp3ACU', 160);

end $$;

-- ── Sample Questions ─────────────────────────────────────────
-- (add after topics are inserted so we can reference by slug)
do $$ 
declare
  t_id uuid;
begin
  -- Q: Quadratic Equations
  select id into t_id from public.topics where slug = 'm-alg-1';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'Solve for x: 2x² − 5x − 3 = 0', 'medium', 5,
   'x = 3 or x = −½',
   ARRAY['3','-1/2','2x+1','x-3'],
   '[{"step":"Write in standard form: 2x² − 5x − 3 = 0","marks":1},{"step":"Factorise: (2x + 1)(x − 3) = 0","marks":2},{"step":"State both final solutions correctly","marks":2}]');

  -- Q: Differential Calculus
  select id into t_id from public.topics where slug = 'm-calc-2';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'Given f(x) = 2x³ − 3x² − 12x + 4, determine the derivative f′(x).', 'medium', 3,
   'f′(x) = 6x² − 6x − 12',
   ARRAY['6x^2','6x','12'],
   '[{"step":"Differentiate first term: 6x²","marks":1},{"step":"Differentiate second term: −6x","marks":1},{"step":"Differentiate constant term to get −12","marks":1}]');

  -- Q: Optimisation
  select id into t_id from public.topics where slug = 'm-calc-4';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'A rectangular box (no lid) with a square base has a volume of 32 cm³. Express the surface area S in terms of the base side x, then determine the value of x that minimises S.', 'hard', 6,
   'x = 4 cm',
   ARRAY['128/x','4','dS/dx','x^3'],
   '[{"step":"Express height h = 32/x²","marks":1},{"step":"Write S = x² + 4x·h = x² + 128/x","marks":2},{"step":"Differentiate: dS/dx = 2x − 128/x²","marks":1},{"step":"Set equal to zero: 2x = 128/x²","marks":1},{"step":"Solve: x = 4 cm","marks":1}]');

  -- Q: Sequences
  select id into t_id from public.topics where slug = 'm-seq-1';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'The 3rd term of an arithmetic sequence is 7 and the 8th term is 22. Calculate the common difference d and the first term a.', 'medium', 4,
   'd = 3, a = 1',
   ARRAY['3','1','d=3','a=1'],
   '[{"step":"Set up simultaneous equations: a + 2d = 7 and a + 7d = 22","marks":1},{"step":"Subtract: 5d = 15, so d = 3","marks":2},{"step":"Substitute to find a = 1","marks":1}]');

  -- Q: Finance
  select id into t_id from public.topics where slug = 'm-fin-3';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'Lindiwe deposits R1 500 at the end of each month into an account earning 8.4% p.a. compounded monthly. Calculate the value of the account after 3 years.', 'hard', 5,
   'R60 345.73',
   ARRAY['60345','0.007','36','1500'],
   '[{"step":"Identify: x=1500, i=0.084/12=0.007, n=36","marks":1},{"step":"Apply future value formula: F = x[(1+i)^n − 1]/i","marks":2},{"step":"Calculate (1.007)^36","marks":1},{"step":"Arrive at F ≈ R60 345.73","marks":1}]');

  -- Q: Trig
  select id into t_id from public.topics where slug = 'm-trig-4';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'Solve for x ∈ [−180°; 180°]: 2sin(x + 30°) = 1', 'hard', 6,
   'x = 0° or x = −60°',
   ARRAY['0','−60','sin','30'],
   '[{"step":"Isolate: sin(x + 30°) = 0.5","marks":1},{"step":"Reference angle: x + 30° = 30°","marks":1},{"step":"General solution 1st quadrant: x + 30° = 30° + 360°k","marks":1},{"step":"General solution 2nd quadrant: x + 30° = 150° + 360°k","marks":1},{"step":"Solve for x in each case","marks":1},{"step":"Apply domain restriction to get x = 0° and x = −60°","marks":1}]');

  -- Q: Euclidean Geometry
  select id into t_id from public.topics where slug = 'm-geo-1';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'O is the centre of a circle. If angle BOC = 140°, calculate angle BAC where A is a point on the major arc.', 'medium', 4,
   'angle BAC = 70°',
   ARRAY['70','140','half','centre'],
   '[{"step":"State the theorem: angle at centre = 2 × angle at circumference","marks":1},{"step":"Identify angle BAC subtends same arc BC as angle BOC","marks":1},{"step":"Calculate: angle BAC = 140° ÷ 2","marks":1},{"step":"State answer: angle BAC = 70°","marks":1}]');

  -- Q: Newton's Laws
  select id into t_id from public.topics where slug = 'p-mech-1';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'A 5 kg block is pulled along a horizontal surface by a horizontal force of 30 N. The coefficient of kinetic friction is 0.2. Calculate the acceleration of the block. (g = 9.8 m·s⁻²)', 'medium', 6,
   'a = 4.04 m·s⁻²',
   ARRAY['4.04','9.8','friction','49','9.8'],
   '[{"step":"Calculate normal force: N = mg = 5 × 9.8 = 49 N","marks":1},{"step":"Calculate friction force: f_k = μN = 0.2 × 49 = 9.8 N","marks":2},{"step":"Apply Newton''s Second Law: F_net = F − f_k = 30 − 9.8 = 20.2 N","marks":1},{"step":"Calculate acceleration: a = F_net/m = 20.2/5","marks":1},{"step":"State answer: a = 4.04 m·s⁻²","marks":1}]');

  -- Q: Projectile Motion
  select id into t_id from public.topics where slug = 'p-mech-2';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'A ball is thrown vertically upward with an initial velocity of 15 m·s⁻¹. Calculate its maximum height if g = 9.8 m·s⁻².', 'hard', 4,
   'h = 11.48 m',
   ARRAY['11.48','v^2','u^2','2as'],
   '[{"step":"State equation: v² = u² + 2as","marks":1},{"step":"At maximum height v = 0; substitute: 0 = 15² + 2(−9.8)s","marks":2},{"step":"Calculate s = 225/19.6 ≈ 11.48 m","marks":1}]');

  -- Q: Momentum
  select id into t_id from public.topics where slug = 'p-mech-3';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'A 2 kg trolley moving at 4 m·s⁻¹ east collides and sticks to a 3 kg trolley at rest. Calculate the velocity of the combined trolleys after the collision.', 'medium', 5,
   'v = 1.6 m·s⁻¹ east',
   ARRAY['1.6','east','8','5'],
   '[{"step":"State conservation of momentum: p_before = p_after","marks":1},{"step":"Write: m₁v₁ + m₂v₂ = (m₁+m₂)v_f","marks":1},{"step":"Substitute: 2×4 + 3×0 = 5×v_f","marks":1},{"step":"Calculate: v_f = 8/5 = 1.6 m·s⁻¹","marks":1},{"step":"State direction: east","marks":1}]');

  -- Q: Electrostatics
  select id into t_id from public.topics where slug = 'p-elec-1';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'Two point charges of +6 μC and −4 μC are separated by 0.3 m. Calculate the magnitude of the electrostatic force between them. (k = 9×10⁹ N·m²·C⁻²)', 'medium', 4,
   'F = 2.4 N',
   ARRAY['2.4','9e9','6e-6','4e-6','0.09'],
   '[{"step":"State Coulomb''s Law: F = kq₁q₂/r²","marks":1},{"step":"Substitute values correctly (note r² = 0.09)","marks":1},{"step":"Calculate numerator: 9×10⁹ × 6×10⁻⁶ × 4×10⁻⁶ = 0.216","marks":1},{"step":"Divide by 0.09: F = 2.4 N","marks":1}]');

  -- Q: Electric Circuits
  select id into t_id from public.topics where slug = 'p-elec-2';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'A battery with emf 12 V and internal resistance 0.5 Ω is connected to an external resistor of 3.5 Ω. Calculate the current in the circuit and the terminal potential difference.', 'hard', 6,
   'I = 3 A; V_terminal = 10.5 V',
   ARRAY['3','10.5','12','0.5','3.5'],
   '[{"step":"State: ε = I(R+r)","marks":1},{"step":"Calculate I: 12 = I(3.5 + 0.5) = 4I","marks":2},{"step":"I = 3 A","marks":1},{"step":"Calculate terminal pd: V = ε − Ir = 12 − 3×0.5 = 10.5 V","marks":2}]');

  -- Q: Organic Chemistry
  select id into t_id from public.topics where slug = 'p-chem-1';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'Give the IUPAC name for the compound with the structure: CH₃−CH(CH₃)−CH₂−CH₂OH', 'medium', 3,
   '3-methylbutan-1-ol',
   ARRAY['3-methyl','butan','1-ol','methylbutan'],
   '[{"step":"Identify longest chain containing OH: 4 carbons → butanol","marks":1},{"step":"Number from OH end: OH at C1 → butan-1-ol","marks":1},{"step":"Identify branch: methyl at C3 → 3-methylbutan-1-ol","marks":1}]');

  -- Q: Equilibrium
  select id into t_id from public.topics where slug = 'p-chem-4';
  insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide) values
  (t_id, 'For the reaction N₂(g) + 3H₂(g) ⇌ 2NH₃(g) ΔH < 0, predict the effect of increasing temperature on the position of equilibrium and on K_c.', 'medium', 4,
   'Equilibrium shifts left; K_c decreases.',
   ARRAY['left','decrease','exothermic','forward'],
   '[{"step":"Identify reaction as exothermic (ΔH < 0)","marks":1},{"step":"Apply Le Chatelier''s Principle: increasing T favours endothermic reverse reaction","marks":1},{"step":"Conclude: equilibrium shifts to the left","marks":1},{"step":"State: K_c decreases as temperature increases for an exothermic reaction","marks":1}]');

end $$;

-- ── Realtime (optional) ───────────────────────────────────────
alter publication supabase_realtime add table public.profiles;
