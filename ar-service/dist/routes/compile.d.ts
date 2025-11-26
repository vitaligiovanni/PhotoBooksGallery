/**
 * POST /compile - Create new AR compilation job
 *
 * Receives compilation request from backend, creates ar_projects record,
 * enqueues pg-boss job, and returns immediately (non-blocking)
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=compile.d.ts.map