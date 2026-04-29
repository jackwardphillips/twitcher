# Plan: API Hardening & Background Scaling

## Phase 1: Security & Auth
- [ ] Implement API Key middleware for ingestion routes
- [ ] Add rate limiting to the ingest endpoint
- [ ] Add single-flight protection for startup/API ingestion overlap

## Phase 2: Task Coalescing
- [ ] Implement a `TaskLock` service to prevent redundant LLM/Photo calls
- [ ] Refactor summarization and photo services to use the lock
- [ ] Refactor enrichment dispatch to queue only newly created sightings instead of rescanning a rolling three-day backlog
- [ ] Move enrichment execution off the request path with bounded worker concurrency and backpressure

## Phase 3: Pagination
- [ ] Update backend endpoints to support limit/offset pagination
- [ ] Update frontend components to support "Load More" or paginated scrolling
