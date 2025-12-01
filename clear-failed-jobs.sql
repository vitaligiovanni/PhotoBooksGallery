-- Clear all failed ar-compile jobs from pg-boss queue
DELETE FROM pgboss.job WHERE state = 'failed' AND name = 'ar-compile';

-- Show remaining jobs
SELECT name, state, count(*) FROM pgboss.job GROUP BY name, state ORDER BY name, state;
