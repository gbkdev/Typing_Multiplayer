-- seed.sql
-- Sample data for local development (run via `supabase db reset`).

insert into public.texts (content, difficulty, language, kind) values
  ('the quick brown fox jumps over the lazy dog while the sun sets slowly behind the hills', 'easy', 'en', 'words'),
  ('practice makes progress not perfection and every keystroke brings you closer to mastery', 'medium', 'en', 'words'),
  ('the labyrinthine architecture of the ancient citadel bewildered even the most experienced cartographers', 'hard', 'en', 'words'),
  ('simplicity is the ultimate sophistication in every design that lasts the test of time', 'medium', 'en', 'quote'),
  ('the only way to do great work is to love what you do and never stop learning', 'easy', 'en', 'quote');

insert into public.achievements (id, title, description, icon) values
  ('first_race', 'First Race', 'Complete your first typing test', 'flag'),
  ('speed_100', '100 WPM', 'Reach 100 words per minute', 'zap'),
  ('speed_200', '200 WPM', 'Reach 200 words per minute', 'rocket'),
  ('wins_100', '100 Wins', 'Win 100 multiplayer races', 'trophy'),
  ('perfect_accuracy', 'Perfect Accuracy', 'Finish a race with 100% accuracy', 'target'),
  ('streak_7', '7 Day Streak', 'Type on 7 consecutive days', 'flame'),
  ('streak_30', '30 Day Streak', 'Type on 30 consecutive days', 'flame'),
  ('top_100', 'Top 100', 'Reach the top 100 on the global leaderboard', 'crown');
