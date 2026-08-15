# StroySelect: roadmap to BuildZoom-level product maturity

This roadmap uses BuildZoom as a product-quality benchmark, not as a feature-for-feature clone. The goal is to make StroySelect a trusted construction marketplace and project operating system for customers, contractors, and staff.

## Current foundation

StroySelect already has the core marketplace spine:

- customer / contractor / staff roles;
- contractor profiles, verification and portfolios;
- project publishing and contractor discovery;
- bids and contractor selection;
- project chat and attachments;
- project workspace, stages, files and review flow;
- contractor reviews;
- notifications and admin moderation;
- PostgreSQL auth sessions and S3-compatible storage.

## Phase 0 — production hardening

Must be completed before major product expansion.

- finish authorization / IDOR audit for every mutation;
- validate relational constraints and storage integrity;
- CI for lint + production build;
- email verification and account recovery;
- registration abuse protection;
- secret rotation and Git-history cleanup;
- structured application logging and error tracking;
- health/readiness endpoints;
- database backup + restore drill;
- S3 orphan reconciliation procedure;
- deployment runbook and rollback procedure.

Exit criterion: a broken deploy, leaked credential, invalid foreign key, or temporary storage outage must not corrupt project state.

## Phase 1 — trust and contractor identity

Build the trust layer customers need before comparing price.

### Contractor verification

- legal entity / sole proprietor details;
- verification documents;
- licenses / certificates where relevant;
- insurance fields and expiration dates;
- verified phone and email;
- moderation checklist;
- verification history and renewal reminders.

### Trust profile

Public contractor profile should include:

- verified badge and verification date;
- years in business;
- service categories and service areas;
- completed project count;
- portfolio grouped by project type;
- rating distribution, not only average;
- response speed;
- completion / cancellation indicators;
- customer reviews with project context.

## Phase 2 — intelligent project intake and matching

Replace a generic project form with a guided construction brief.

### Project intake wizard

Collect structured data by category:

- property type;
- work type and scope;
- dimensions / quantities where applicable;
- current condition;
- desired materials / finish level;
- plans and photos;
- target budget;
- desired dates;
- location and travel constraints;
- permit / design readiness;
- free-form requirements.

### Matching engine

Rank contractors using explainable factors:

- service/category match;
- geography;
- budget fit;
- verified status;
- relevant portfolio experience;
- ratings and review volume;
- completed projects;
- response performance;
- availability;
- historical win / completion quality.

Store the score components so staff and users can understand why a contractor matched.

### Matching UX

- recommended shortlist instead of a flat catalog;
- "why this contractor" explanations;
- save / dismiss contractor;
- request proposal from selected contractors;
- staff override and manual recommendation.

## Phase 3 — professional RFP and bid comparison

A construction marketplace becomes substantially more useful when bids are comparable.

### Structured bid

Support:

- labor subtotal;
- materials subtotal;
- other costs;
- line items;
- inclusions;
- exclusions;
- assumptions;
- start date;
- duration;
- warranty;
- payment schedule;
- attachments;
- contractor note.

### Bid lifecycle

- draft;
- submitted;
- clarification requested;
- revised;
- shortlisted;
- accepted;
- rejected / withdrawn.

Keep immutable bid revisions and an audit trail.

### Customer comparison

Create a normalized comparison matrix showing:

- total price;
- scope differences;
- omitted items;
- schedule;
- warranty;
- contractor trust indicators;
- risk flags.

## Phase 4 — project consultant / staff CRM

BuildZoom's service model includes human guidance. StroySelect should support a similar operating workflow for managers.

### Staff ownership

- assign a manager/consultant to a project;
- internal project notes;
- tasks and reminders;
- next-action date;
- customer / contractor follow-up state;
- escalation flags;
- full activity timeline.

### Pipeline

Staff dashboard stages:

- new lead;
- qualification;
- brief incomplete;
- matching;
- introductions;
- waiting for bids;
- comparing bids;
- negotiation;
- contractor selected;
- in progress;
- completed / lost.

Include aging and SLA indicators.

## Phase 5 — StroySelect contractor score

Create a proprietary quality score that is useful to both customers and matching.

Possible inputs:

- verification completeness;
- customer rating;
- review confidence / volume;
- relevant completed projects;
- response time;
- proposal quality / completeness;
- selection rate;
- on-time stage completion;
- disputes / cancellations;
- profile and portfolio completeness;
- account standing.

Requirements:

- score history;
- explainable components;
- anti-gaming rules;
- minimum-data confidence indicator;
- staff ability to inspect why a score changed.

## Phase 6 — construction execution system

Expand the existing workspace into a full project control layer.

- milestone budgets;
- stage acceptance;
- change orders;
- schedule dependencies;
- daily / weekly progress updates;
- photo chronology;
- issue / punch-list tracking;
- document center;
- contract versions;
- customer approvals;
- completion / handover checklist.

Payments should be introduced only with a dedicated payment provider and a clear legal/accounting design.

## Phase 7 — communication and scheduling

- reliable real-time chat (WebSocket/SSE instead of polling when scale requires it);
- message delivery/read state;
- email notification delivery;
- optional SMS / messenger notifications;
- meeting / site-visit scheduling;
- reminders;
- notification preferences;
- staff-visible communication timeline.

## Phase 8 — public discovery and data moat

Build a public contractor and project intelligence layer.

- SEO contractor pages;
- category + city landing pages;
- project / portfolio galleries;
- verified review pages;
- searchable contractor directory;
- structured contractor history;
- import of legally available public company / licensing / permit data where available;
- duplicate company resolution and entity matching.

Long term, proprietary structured data should improve matching quality rather than merely increase page count.

## Phase 9 — analytics and marketplace operations

Track the complete marketplace funnel.

Customer funnel:

- visit -> project created -> qualified -> matched -> bids -> selection -> completion -> review.

Contractor funnel:

- registered -> profile complete -> verified -> opportunity viewed -> bid submitted -> selected -> completed.

Operational metrics:

- time to first response;
- time to first bid;
- bids per project;
- match-to-bid conversion;
- bid-to-hire conversion;
- completion rate;
- repeat customer rate;
- contractor retention;
- dispute rate;
- stage delay rate.

## Recommended execution order

1. Finish production hardening and recovery procedures.
2. Add email verification / password recovery / operational observability.
3. Rebuild project intake as a structured category-aware wizard.
4. Implement matching v1 with stored explainable scores.
5. Implement structured bid revisions and bid comparison.
6. Add manager/consultant CRM and project pipeline.
7. Build StroySelect Score.
8. Expand execution workspace with change orders and punch lists.
9. Improve real-time communications and scheduling.
10. Build public data / SEO / analytics layer.

Do not start by cloning surface-level BuildZoom UI. The defensible product is the combination of trusted contractor data, high-quality project briefs, matching, comparable proposals, guided selection, and project execution history.
