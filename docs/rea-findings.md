# REA investigation ledger

27 October 2026. Skill: `C:/PROJECTS/REA/.agents/skills/reverse-engineer-anything/SKILL.md`; installed globally at `C:/Users/shubh/.codex/skills/reverse-engineer-anything`. REA CLI version 6.7.0 through its public launcher. No MCP registration changes.

## Observed REA evidence

| Target / declared action | Evidence ID | Result |
| --- | --- | --- |
| Bhopal initial render | `ev_0111fc951592df6e14002eed5590052c93acc12bfa2f8358be40e218310af611` | Final DOM, viewport screenshot and URL captured. |
| Bhopal: click the SVG group labeled “Ripple Upper Lake”, wait 200ms | `ev_169bcaa2184530d37e1627cf228067ad3f36f720b504beda1b9fa438a8cbdbd6` | Declared click and wait completed; final DOM/screenshot captured. This proves the action executed, not its internal implementation. |
| GDG VIT Chennai initial render | `ev_a054a1b69aecbe6c54ecf7d1c5fb1b8edacb94f8cb4464a4feefa84280d431f9` | Final DOM, viewport screenshot and URL captured. |
| GDG MPSTME Mumbai initial render | `ev_85ee5c93317fca9038bec10f32ae08810ef8dd9d6157f9e726847fb36dcb2a17` | Final DOM, viewport screenshot and URL captured. |
| GDG Noida initial render | `ev_a972bc57aa75f72b2c98cb7ae37f93e79677b5ef2e193ce09c1c984abc7456bc` | Final DOM, viewport screenshot and URL captured. |

All five records report observed, controlled-replay evidence, complete requested captures and `terminated-owned-process` cleanup. Raw records and extracted screenshots are under `.rea/`. Requests specify a temporary browser, public URL, viewport and actions. They do not capture user sessions or private data.

## Corroborating evidence and design choices

- **Observed separately through Firecrawl/browser styles:** Bhopal `#F8F9FA` canvas, `#202124` text, `#FBBC05` yellow pill actions, Inter type and fixed website header. Browser animation samples include 600/800/1100ms transforms, opacity and SVG stroke transitions. See `docs/bhopal-design-system.md` and `.firecrawl/`.
- **Design adaptation, not a source fact:** keep Clubhouse's sage/forest learning surfaces with Bhopal's neutral canvas and yellow action. Use the user's actual campus badge and the existing self-hosted Manrope. Make the hero a usable selected-learner pass instead of reproducing Bhopal's illustration.
- **Relevant motion added:** earned badge marks enter in a brief sequence, the pass settles on hover, action arrows respond on hover and learner avatars give slight pointer feedback. All automatic animation honors reduced motion. No perpetual decorative loops.
- **Supporting campus influence:** welcoming, student-specific voice and prominent chapter identity. Other chapters' people, claims, photos and event details are not reused.

## Limits and unanswered questions

REA captures rendered states and the declared interaction; it did not recover or trace all underlying reference application code. These observations are not a complete reconstruction of the reference, pixel equivalence, or a measured performance comparison. Screenshot values are not scoring rules. Real participant data, scoring and the backend remain deferred.

The current deliverable is three distinct coded directions: retained Guild Clubhouse; Bhopal-led Campus Canvas with an original interactive curriculum collector; and VIT/Noida-led Builders League with nearby-competitor emphasis. These are design adaptations of observed principles, not recovered source implementations. Context for continuation is in `CONTEXT.md`.
