# Unified Project Workspace

## Information architecture

The project workspace has one conceptual navigation model for both roles:

| Section | Workspace route and purpose |
| --- | --- |
| Обзор | `/{role}/work/[id]` — current state, next action, progress, stages, materials and recent history |
| Работа | grouped links to `changes`, `materials`, `appointments` and `issues`; the stage plan remains on the overview at `#project-work` |
| Общение | `/{role}/work/[id]/chat` — project chat with messages, replies, attachments and read state |
| Документы | `/{role}/work/[id]/documents` — project documents, stage files and the contract entry point |
| Ещё | `contract` and `disputes`; the contract print route remains `contract/print` |

The former automatic `WorkspacePageNavigator` was removed. It duplicated project navigation, produced a second mobile navigation layer, and had no stable capability model. Its text-overflow safeguards are now global base styles.

## Shared workspace context

`WorkspaceHeader` is rendered by both role layouts. It presents only existing data:

- project title, location and mapped project status;
- the two project participants with role-appropriate wording;
- current stage and factual progress from accepted stage weights;
- contract availability from the existing active-contract guard;
- one dominant next action.

`getProjectWorkspace` is request-memoized with React `cache`, so a layout and its overview can share the same server-side workspace read in one render. It keeps the existing authentication and participant checks unchanged.

## Role-specific actions

| State | Customer presentation | Contractor presentation |
| --- | --- | --- |
| Contract inactive | Open the existing contract flow | Open the existing contract flow |
| Stage awaiting review | Review materials, accept or return with the existing comment/action | Waiting state and a link to project communication |
| Stage in progress | Read-only progress and stage information | Existing start, submit for review and revision controls |
| No stages | No unauthorized creation action | Existing stage-plan manager and create action |
| Project complete | Existing final completion and contractor review controls | Completion state and project history |

Presentation helpers map backend values to Russian labels only. They do not make permission or lifecycle decisions.

## Preserved capability checklist

| Capability | Route / component retained |
| --- | --- |
| Create, edit, delete, start, submit and resume stages | Overview → `ContractorStageManager` |
| Customer stage approval or revision with comment | Overview → `CustomerStageReview` |
| Stage file upload, gallery and permitted deletion | Overview → stage materials; S3 actions unchanged |
| Project documents and versions | `documents` → `ProjectDocumentCenter` |
| Contract creation, versions, signature, print and DOCX | `contract`, `contract/print` |
| Payments and change orders | `changes` → `ProjectBudgetControlV2` |
| Materials and deliveries | `materials` → existing panels and actions |
| Meetings | `appointments` → `ProjectAppointmentsPanel` |
| Issues and disputes | `issues`, `disputes` → existing boards/actions |
| Messages, replies, edits, deletion, typing and attachments | `chat` → `ProjectChat` |
| Completion and contractor review | Customer overview → existing controls |

## Status and progress presentation

Stage status is mapped from the existing backend values: `planned` → «Запланирован», `in_progress` → «В работе», `awaiting_review` → «Готов к проверке», `revision_required` → «Требуются исправления», and `completed` → «Принят».

Progress uses existing accepted-stage weights only when stage weights exist. If they do not, the UI shows the factual `N из M` count instead of inventing a percentage.

## Mobile behavior and accessibility

- The project section selector remains the single compact navigation control below `lg`; communication is a real route rather than a long-page anchor.
- Chat keeps its composer outside the independently scrolling message list, and the chat page reserves the mobile navigation safe area.
- Workspace copy, file names and URLs use wrapping/min-width safeguards; tables and media cannot widen the page.
- Headings, landmarks, progressbar labels, focus-visible styles and 44px-scale controls are preserved. Status labels always include text, not color alone.

## Deliberate boundaries

This redesign does not alter database schema, SQL, RLS, authentication/session checks, authorization, server actions, Zod/FormData contracts, status transitions, payment behavior, document/S3 storage, chat protocol, notifications, webhooks, or admin UI.
