# 1.1.2 patch verification

1. Open the dashboard from Configure Settings and run **Import missing Actors**.
2. Confirm the progress dialog appears above the dashboard and remains visible while processing.
3. Confirm a successful operation closes the progress dialog automatically after the summary notification.
4. Start another operation and close the dashboard while the progress window exists; confirm no orphaned progress window remains.
5. Force a controlled import failure in a test world and confirm the error progress remains visible until the dashboard is closed.

---

# Manual Test Plan - Hunter's Bestiary - D&D 5e 2024 1.1.0


1. Back up a disposable Foundry v13 world.
2. Install the new core first, then each enabled complementary module in dependency order.
3. Verify canonical titles in Manage Modules, Module Settings, window headers, notifications, generated folders, and confirmations.
4. Open each dashboard, resize/move/close/reopen it, then test **Reset size** and **Reset position**.
5. Type into every search field without losing focus or caret; remove characters and verify hidden entries return.
6. Run validation and diagnostics as GM; verify players do not see provider truth or destructive controls.
7. Run every relevant import/update workflow and confirm real phase/count/percentage feedback.
8. Cancel or close progress safely where supported, induce a controlled failure, and inspect the final summary/error detail.
9. For deletion, inspect the exact eligible list, cancel once, then confirm in a disposable world; verify unrelated/user-modified Documents survive.
10. Test startup with all modules, each supported subset, a disabled complementary module, a missing dependency, an incompatible API declaration, and valid/invalid third-party naming metadata.
11. Confirm one invalid-name warning at startup and one per intentional dashboard open, with no rerender loop.
12. Verify English and German UI paths and keyboard-only operation.



## 1.1.3 targeted checks

1. Place managed Actors in each released legacy default folder name and open the world.
2. Verify a pre-existing empty canonical folder receives the managed Actors and the old folder is removed only when empty.
3. Verify an unrelated Actor in the old folder remains there.
4. Run **Repair imported data folders** and verify the operation is idempotent.
5. Run **Delete imported data**, inspect the candidate counts, cancel once, then confirm.
6. Verify exact managed Actors and harvest Items are deleted, matching Actor links are cleared, and unrelated Documents survive.
