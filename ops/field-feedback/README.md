# FIELD feedback delivery

The form in FIELD posts JSON to `VITE_FIELD_FEEDBACK_URL`. That address is public. The mail secret stays on the worker.

Sending is **not active** until the steps below are done and a real message arrives at `inspiromaciek@gmail.com`.

## 1. Deploy the worker

1. Create a free Cloudflare account.
2. Workers & Pages → Create → Import the worker, or paste `ops/field-feedback/worker.js`.
3. Deploy. Copy the `https://….workers.dev` URL.

Optional, more reliable mail:

1. Create a Resend account and verify a sender domain.
2. Worker → Settings → Variables:
   - `RESEND_API_KEY` — secret, the Resend API key
   - `FEEDBACK_FROM` — a verified sender, for example `FIELD <feedback@your-domain>`
3. Redeploy.

Without those two variables the worker uses FormSubmit. The first message asks `inspiromaciek@gmail.com` to confirm the address. Until that confirmation, FormSubmit returns an error and FIELD keeps the answers in the form.

## 2. Point the FIELD build at the worker

GitHub → repository → Settings → Secrets and variables → Actions → Variables → New repository variable:

- Name: `FIELD_FEEDBACK_URL`
- Value: the worker `https://` URL

`.github/workflows/pages.yml` passes that variable into `npm run build` as `VITE_FIELD_FEEDBACK_URL`. The next push to `main` publishes a build that can send.

Local check:

```bash
VITE_FIELD_FEEDBACK_URL=https://your-worker.workers.dev npm run dev
```

## 3. Confirm a real message

1. Open FIELD, choose Send feedback, answer one question, and send.
2. Check `inspiromaciek@gmail.com`, including spam.
3. If FormSubmit asks to activate the address, confirm it and send once more.

Until step 3 succeeds, treat delivery as not active. The form must say so instead of showing thanks.
