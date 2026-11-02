# Migration to 1.1.7

No world-data migration is required. Replace the complete module directory and restart Foundry. The base registry contract is additive; supported complementary modules should use `validateStatblocks(records, options)` and `registerStatblocks(providerId, records, options)`.
