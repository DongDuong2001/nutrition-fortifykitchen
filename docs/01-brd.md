# 1. Business Requirements Document (BRD)

Nutrition Web gives gym-goers a free, Vietnamese-first tracker for calories, macros and micronutrients, and earns money from a paid tier built on the coach's knowledge; it also sends users to Fortify Kitchen.

## Problem

- Gym-goers in Vietnam count macros in apps built for Western food (Cronometer, MyFitnessPal). Vietnamese dishes such as phở, cơm tấm or rau muống are missing or wrong.
- Those apps keep vitamins, minerals and electrolytes behind a paywall or hide them. The coach treats them as core ("200% Cronometer", sodium as the foundation).
- Good advice exists but lives in the coach's head and posts. No tool applies it to a person's own day.

## Business model

| Tier | Includes | Price |
| --- | --- | --- |
| Free | Account, synced diary, calories, macros, vitamins, minerals, electrolytes against targets | Free |
| Paid | Coach recommendations (suggestions, training-day guidance, meal planning), trends and history, custom foods and recipes | To decide |

The free tier is generous on purpose: it beats competitors on micronutrients and Vietnamese food, and it feeds the paid tier and Fortify Kitchen orders.

## Goals

| # | Goal | Measure (targets to set) |
| --- | --- | --- |
| G1 | Launch fast | First version live within 1 month |
| G2 | Logging is quick | Median time to log a day |
| G3 | Users come back | Share of sign-ups still logging in their second week |
| G4 | People pay | Free-to-paid conversion after the paid tier opens |
| G5 | Advice is the coach's | Every target and recommendation traces to a published coach knowledge version |
| G6 | Fortify benefits | Users who order from Fortify Kitchen after signing up |

The numeric targets for G2–G4 and G6 are an open question (see Overview).

## Audience

- **Primary:** anyone who tracks food, anywhere; first users are gym-goers and macro-counters who train regularly.
- **Secondary:** Fortify Kitchen customers and subscribers.
- **Knowledge owner:** the coach, whose knowledge base is the standard for every target, algorithm and recommendation.

## Scope

**Release 1 (within 1 month):** accounts, profile, synced diary, food search, calories, macros, vitamins, minerals and electrolytes against targets, Vietnamese and English.

**Release 2 (right after):** Fortify menu and ordering link, coach knowledge-base import with approval, paid tier and payments, coach recommendations.

**Later:** trends and history, custom foods and recipes, AI explanations grounded only in the coach's notes.

**Out of scope:** barcode scanning, photo recognition, wearable sync, native mobile apps (the web works on phones), medical advice.

## Constraints

- One month to the first release, built by Hào, Dong and Claude; Dong reviews pull requests.
- Reuse the existing Fortify stack (Next.js, NestJS, PostgreSQL, Vercel and Render) to keep cost and work low.
- All targets, algorithms and advice must come from the coach's knowledge base. Where the coach has no number yet, the app shows a labelled reference value and gives no advice.
- Diet and body data is personal and health-related (see SRS, privacy).

## Stakeholders

| Person | Role | Signs off on |
| --- | --- | --- |
| Hào (Vu Thien Minh Hao) | Product owner | Scope, priorities, publishing each coach-knowledge version |
| Duong Phu Dong | Engineer and reviewer | Technical design, pull requests |
| Coach Khánh | Knowledge owner | Content of the knowledge base |

## Risks

| Risk | Effect | Mitigation |
| --- | --- | --- |
| One month is tight | Late or buggy launch | Release 1 limited to logging and targets; everything else after |
| A note typo changes targets | Wrong advice to users | Import creates a draft; Hào approves the change list before publishing |
| Food values are estimates | Users distrust numbers | Label estimates; replace with label or lab values, Fortify products first |
| Free tier too generous | Few paid users | Watch conversion; paid value is the coach's personal recommendations |
| Health-data privacy | Legal and trust risk | Consent at sign-up, export and delete, minimal data |
| Advice unsuitable for some users | Harm | Disclaimer; warnings on salt and caffeine guidance |
