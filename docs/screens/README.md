# RecallRelay screen captures

Chromium captures from the polished app at 1440 × 1080 and 390 × 844. Longer screens include the full page. Dialog captures show the viewport. The 1024 px layout was also checked in the browser.

| Screen | 1440 px | 390 px |
| --- | --- | --- |
| Home | [Desktop](1440/home.png) | [Phone](390/home.png) |
| Setup before seeding | [Desktop](1440/setup-empty.png) | [Phone](390/setup-empty.png) |
| Setup with orders | [Desktop](1440/setup.png) | [Phone](390/setup.png) |
| Notice | [Desktop](1440/notice.png) | [Phone](390/notice.png) |
| Extraction progress | [Desktop](1440/extracting.png) | [Phone](390/extracting.png) |
| Extracted details and quotes | [Desktop](1440/evidence.png) | [Phone](390/evidence.png) |
| Extraction warnings | [Desktop](1440/warnings.png) | [Phone](390/warnings.png) |
| Extraction error | [Desktop](1440/extraction-error.png) | [Phone](390/extraction-error.png) |
| Review | [Desktop](1440/review.png) | [Phone](390/review.png) |
| Review with lower order outcomes | [Desktop](1440/review-outcomes.png) | [Phone](390/review-outcomes.png) |
| Approval dialog | [Desktop](1440/approval.png) | [Phone](390/approval.png) |
| Refund result | [Desktop](1440/result.png) | [Phone](390/result.png) |
| Repeat approval toast | [Desktop](1440/repeat-approval.png) | [Phone](390/repeat-approval.png) |
| Pending refund | [Desktop](1440/pending.png) | [Phone](390/pending.png) |
| Failed refund | [Desktop](1440/failed.png) | [Phone](390/failed.png) |
| Empty refund result | [Desktop](1440/result-empty.png) | [Phone](390/result-empty.png) |
| Recall activity | [Desktop](1440/activity.png) | [Phone](390/activity.png) |
| Reconnecting | [Desktop](1440/reconnecting.png) | [Phone](390/reconnecting.png) |
| Page not found | [Desktop](1440/not-found.png) | [Phone](390/not-found.png) |

Compared with the [Stitch references](../../design/stitch/), the captures retain the sky-blue landing and success heroes, navy workflow areas, pale cards, yellow quote highlights, and status colors. The demo guide occupies a reserved rail on wide screens and an inline card on narrower screens. Review keeps the approval amount in view below its scrolling order list. The activity drawer shows the events available in the app.

The mock adapter produced the normal, empty, and failed captures. The local HTTP stub supplied pending and reconnecting states. To regenerate the gallery, set `RECALLRELAY_SCREENSHOTS=1` and run `npm run test:e2e` and `npm run test:real` from `frontend/`.
