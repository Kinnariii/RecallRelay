# Backend plan

1. Establish strict startup configuration, SQLite storage, health, and JSON errors.
2. Test deterministic lot matching and cent-based plans before connecting routes.
3. Implement sandbox OAuth, checkout, capture, and refunds against the published wire formats.
4. Connect demo seed, reset, order reads, and buyer return. Add structured notice extraction and edits.
5. Reserve refunds transactionally, persist authorized plans, and test replay, retry, balance, and polling behavior against a local provider stub.
6. Add request limits and logging, document setup and deployment, and verify the existing frontend against the backend.

Use the supplied specification for business rules and the API contract for response shapes. Live acceptance requires the team’s sandbox accounts and AI credentials.
