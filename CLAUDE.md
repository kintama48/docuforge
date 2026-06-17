# Claude / Agent Conventions (mirrors key items from AGENTS.md)

For the full agent operating manual see `AGENTS.md`. This file pulls the two house-rules that bite if forgotten:

## Use Graphify for code changes

From 2026-06-15 onward, all code modifications in this repo should be made through Graphify rather than direct Edit/Write. If Graphify is currently in use by another process, continue working with available tools and switch to Graphify as soon as it frees up — do not block waiting on it.

## Use the Mac for development + testing

The Digital Ocean droplet (`ssh do_droplet`) is for **deployments only** — do not use it for dev work, ad-hoc renders, or testing. All local rendering / template iteration / verification should happen on the Mac.
