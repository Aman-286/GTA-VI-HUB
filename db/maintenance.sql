DELETE FROM rate_limits WHERE reset_at < unixepoch()*1000;
DELETE FROM sessions WHERE expires_at < unixepoch()*1000;
DELETE FROM search_events WHERE created_at < datetime('now','-30 days');
PRAGMA optimize;
