# Legacy Competitor Benchmark Harness

This directory contains the legacy local competitor benchmark runner.

Preferred path moving forward:

- k6 load test suite in `load-test/`
- run with `cd frontend && npm run bench:load`

Legacy commands (still available):

```bash
cd frontend
npm run bench:competitors:legacy
npm run bench:competitors:legacy:strict
```

The legacy harness remains useful for one-off local side-by-side engine tests, but the primary benchmark source should come from repeatable k6 profiles in `load-test/`.
