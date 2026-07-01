// ORMS background worker — PLACEHOLDER.
//
// Phase 5 replaces this with a BullMQ Worker that consumes the 'video-poll' queue:
//   - poll OpenRouter every 10s for the job's status
//   - on completion, download the mp4 to object storage (R2)
//   - update the generations row in Postgres to completed/failed
//
// Until then this process just idles so the workspace layout (apps/web + apps/worker)
// is complete and `npm run worker:dev` is wired.

function main() {
  console.log('[worker] placeholder started — no queue configured yet (Phase 5).');
  // Keep the process alive so `tsx watch` / container runtime does not exit.
  setInterval(() => {}, 1 << 30);
}

main();
