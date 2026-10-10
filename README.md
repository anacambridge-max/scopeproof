# ScopeProof MVP

A free, mobile-friendly prototype for freelancers and small agencies to document original project scope, price extra work, and keep a local decision history.

## Features
- Dashboard totals and recent projects
- Project creation with original scope, price, client, currency and due date
- Change requests with pricing, estimated hours and deadline impact
- Local simulated approval / decline flow
- Approval history
- Project, change request and history reports using browser Print → Save as PDF
- JSON backup export
- Responsive desktop/iPhone layout

## Run
Open `index.html` in a modern browser. No install, API key, server or paid service is required.

## Deploy on GitHub Pages
1. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root.
2. Open Settings → Pages.
3. Select Deploy from a branch, branch `main`, folder `/(root)`, and Save.
4. Wait for the site to publish; GitHub shows the URL in Pages settings.

## Important limitations
This is a local-only prototype. Data stays in each visitor's browser. The approval preview and approve/decline actions are simulated, do not notify a client, do not verify identity and do not create legally verified signatures or a tamper-proof audit log. Real shared approval URLs need a backend/database, secure tokens, access controls, server timestamps and audit logging. GitHub Pages alone cannot provide this securely.

Do not enter confidential customer data into a public demo. Export JSON backups regularly. This software is not legal advice.
