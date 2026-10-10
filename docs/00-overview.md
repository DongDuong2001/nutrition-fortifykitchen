# Nutrition Web — Project Documents

Oct 9, 2026 · @Vũ Thiên Minh Hào

Nutrition Web (working name; its own brand, linked to Fortify Kitchen) is a free calorie, macro and micronutrient tracker with a paid tier for the coach's recommendations. The first version goes live within a month. The six documents it needs are in the tabs.

## Decisions (from Hào, 09/10/2026)

| Topic | Decision |
| --- | --- |
| Name | Separate brand, name decided later; "Nutrition Web" is a placeholder |
| Audience | Anyone who tracks food, anywhere, not only Ho Chi Minh City; gym-goers are the first users; linked to Fortify Kitchen |
| Business model | Free tier + paid tier |
| Free tier | Diary, calories, macros, vitamins, minerals, electrolytes |
| Paid tier | Coach recommendations, trends and history, custom foods and recipes |
| Accounts | Required; diary syncs across devices |
| Coach's knowledge | The standard for every target, algorithm, recommendation and piece of advice. The coach writes in Obsidian; notes are imported into the database; Hào approves each version before it goes live; the app reads only the published version |
| First release | Within 1 month: accounts, synced diary, calories, macros and micronutrients against targets |
| Right after | Fortify menu and ordering link, payments and the paid tier, knowledge-base import and approval |
| Team | Hào, Dong and Claude build it together; Dong reviews pull requests |
| Languages | Vietnamese first, English second |
| Codebase | Its own monorepo (Dong's scaffold): Next.js web app, Go API and its own PostgreSQL schema, separate from Fortify Kitchen. Fortify menu sync is kept for later |

## How the six documents fit

| # | Document | Answers | Main reader |  |
| --- | --- | --- | --- | --- |
| 1 | BRD | Why build it, for whom, how it makes money, how we measure success | Hào, coach |  |
| 2 | PRD | What it does, in which release | Hào, Dong |  |
| 3 | SRS | Exactly how each feature and calculation behaves | Dong, testers |  |
| 4 | IA & Wireframes | Which screens exist and how users move between them | Hào, Dong |  |
| 5 | Design System | How it looks and stays consistent | Hào, Dong |  |
| 6 | Technical Design | How it is built, stored, secured and deployed | Dong |  |

## Open questions

- [ ] Brand name and domain
- [ ] Paid tier price and billing period, and how people pay (VietQR transfer like Fortify Kitchen, or card)
- [ ] Success targets: how many sign-ups, active users and paid users count as success after 1 and 3 months
- [ ] Do Fortify subscribers get the paid tier free or discounted?
- [ ] Where the coach's Obsidian vault lives (his own Git repo, a shared folder) and how often he updates it
- [ ] Coach's numbers for vitamins A, C, D, E, K and the B group, to replace the national reference values
- [ ] Is the 4–6 g salt rule for added salt only, or total sodium from all food?
- [ ] Who designs the screens: Hào, Dong or Claude from the current tracker
