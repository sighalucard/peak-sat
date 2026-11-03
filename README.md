# Peak SAT

Digital SAT prep with adaptive practice, a context-aware AI tutor, spaced review of mistakes, and full-length adaptive practice tests. Built with Next.js 15, React 19, Prisma, and the Claude API.

## Run it locally

```bash
npm install                 # also runs prisma generate
cp .env.example .env        # then set AUTH_SECRET (and ANTHROPIC_API_KEY for the tutor)
npm run db:migrate          # creates the SQLite dev database
npm run dev                 # http://localhost:3000
```

Environment variables (server-side only; nothing secret is sent to the browser):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | `file:./dev.db` locally. Use Postgres in production (change `provider` in `prisma/schema.prisma`). |
| `AUTH_SECRET` | yes | 32+ random characters, used to sign session cookies. `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | for the tutor | Without it the tutor shows an "unavailable" message and everything else works. |
| `NEXT_PUBLIC_DESMOS_API_KEY` | for production | Desmos's demo key is used if unset. It's fine for development only; get a production key from Desmos. |

## Checks

```bash
npm run check:bank   # validates every question; math answers are checked by code
npm test             # unit tests (grading, mastery model, spaced repetition, plan, validator)
npm run build && PORT=3100 npm start &
npm run test:e2e     # API smoke test against a running server on port 3100
npm run eval:tutor -- --yes   # real API calls: tutor accuracy, pushback, and hint-leak eval
```

## How it's organized

- `src/content/`: question bank (original questions only), skill taxonomy, lessons, and the research-methods list. Math questions come from seeded templates; each instance has its own answer checker, and the validator rejects any question whose key fails or whose distractor passes.
- `src/lib/`: auth, the mastery model (per-skill logistic rating), spaced repetition (SM-2 variant), recommendations, the daily plan, session engine (practice, review, timed, diagnostic, and full adaptive tests), and the tutor prompt.
- `src/app/api/`: every grading, scoring, and AI call happens here, on the server. The answer key never reaches the browser before a question is graded.
- `src/app/(app)/`: the signed-in app: Dashboard, Practice, AI Tutor, Study Plan, Mistake Review, Full SAT Tests, Lessons, Progress, Settings, Desmos training.

## Honest limitations

- Score estimates and practice-test scores are unofficial. Adaptive routing follows the published two-stage design, but the threshold and scaling are approximations, not College Board's.
- The bank holds 303 questions (93 Reading and Writing, 210 Math). Full tests draw from the same pool as practice, so heavy users will see repeats.
- The tutor's behavior has only been tested without an API key. Run `npm run eval:tutor` once a key is set.
- The rate limiter is in-memory, so with several server instances, use a shared store such as Redis.

SAT® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, this product.
