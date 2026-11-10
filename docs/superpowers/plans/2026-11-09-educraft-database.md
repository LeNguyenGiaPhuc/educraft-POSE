# EduCraft Database Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` for inline implementation.

**Goal:** Create a reproducible PostgreSQL database for the approved EduCraft scope.

**Architecture:** Prisma is the model and migration owner. PostgreSQL enforces keys, uniqueness, row checks, and indexes; cross-row and authorization rules are documented for service transactions.

**Tech Stack:** PostgreSQL, Prisma, SQL migrations.

**Spec:** `D:/TIỂU LUẬN CHUYÊN NGÀNH/ERD/EDUCRAFT_DATABASE_DESIGN.md`, `EDUCRAFT_DATABASE_REVIEW_2026-11-09.md`, and updated SRS.

## Tasks

- [x] Define all required tables, enums, relations, defaults, and indexes in `backend/prisma/schema.prisma`; validate schema.
- [x] Generate an initial migration and add PostgreSQL-only checks, partial indexes, and composite integrity rules; PostgreSQL engine unavailable locally, so SQL parser verification is recorded instead.
- [x] Add minimal setup instructions and a schema contract audit, including Q1–Q5 and the review corrections; check generated artifacts.

## Review Focus

- One active enrollment per student while historical memberships remain.
- Notebook AI drafts remain separate from teacher-finalized assessments.
- Notebook period reopen preserves older deadlines and results.
- Teacher prompt topics are scoped to student and classroom subject.
- Question/answer ownership and citations do not cross activity or subject boundaries.
