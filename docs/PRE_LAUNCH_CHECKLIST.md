# Pre-Launch and App Review Checklist

Use this checklist before submitting to App Store Review.

---

## 1. Sandbox and IAP Testing

- [ ] **Sandbox Tester created** (App Store Connect → Users and Access → Sandbox → Testers)
- [ ] **Signed in on iPhone** (Settings → App Store → Sandbox Account)
- [ ] **Purchase Yearly** (with 3-day trial) works in TestFlight
- [ ] **Purchase Monthly** (no trial) works in TestFlight
- [ ] **Restore** works from onboarding paywall
- [ ] **Restore** works from in-app paywall and Settings → Restore Purchases
- [ ] **Record** works after subscribing
- [ ] **Paywall** appears when tapping Record without subscription (`trigger=not_subscribed`)

---

## 2. Functional Flows (TestFlight)

| # | Flow | Pass? |
|---|------|-------|
| 1 | Onboarding: Name → Challenge → Notifications → Commitment → Paywall | |
| 2 | Paywall: Yearly (trial) and Monthly (no trial), prices load | |
| 3 | Purchase Yearly with Sandbox → success → home | |
| 4 | Record: mic permission → 30s+ → stop → processing → output with tasks | |
| 5 | Output: save tasks, see them on Home | |
| 6 | Without premium: tap Record → paywall | |
| 7 | Restore from paywall and Settings | |
| 8 | Settings: Notifications, Language, Restore, Manage Subscription, Privacy, Terms | |
| 9 | Links: Privacy, Terms, Support, mailto:support@unbindapp.com open | |
| 10 | No crash on background/foreground or after idle | |

---

## 3. App Store Connect

- [ ] **Screenshots** (6.7" 1290×2796, 6.5" 1284×2778; 5.5" optional)
- [ ] **Description**, **Keywords** (max 100 chars), **Promotional Text** (170 chars)
- [ ] **App Privacy** matches declared data (Name, User ID, etc.)
- [ ] **In-App Purchases**: no "Missing Metadata"; Yearly has trial, Monthly does not
- [ ] **App Review Information**: Contact (phone, email), **Notes** (see `APP_REVIEW_NOTES.txt`)
- [ ] **Build** selected, **What's New** written

---

## 4. Ready to Submit

- [ ] Sandbox Tester created and signed in on iPhone
- [ ] Yearly and Monthly purchase work in TestFlight
- [ ] Restore works (paywall + Settings)
- [ ] Record works when subscribed; paywall when not
- [ ] No crashes in main flows
- [ ] App Store Connect: screenshots, description, keywords, Privacy
- [ ] IAP: no Missing Metadata, trial on Yearly only
- [ ] App Review notes and contact info filled
- [ ] Build selected and What's New written

---

## References

- App Review notes: `docs/APP_REVIEW_NOTES.txt`
- App Store metadata (keywords, subtitle, sizes): `docs/APP_STORE_METADATA.md`
