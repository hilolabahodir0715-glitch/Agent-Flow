# Security Specification for AgentFlow

## Data Invariants
1. A Client must be associated with an agent (`agentId`).
2. An Order must reference a valid Client and Agent.
3. A Payment must reference a valid Client and Agent.
4. Total amount of an Order must be positive.
5. Payment amount must be positive.
6. Users can only see and manage their own Clients, Products, Orders, and Payments.

## The Dirty Dozen Payloads
1. **Identity Spoofing**: Attempt to create a client with an `agentId` of another user.
2. **Identity Spoofing (Read)**: Attempt to read a client belonging to another agent.
3. **Identity Spoofing (Update)**: Attempt to update a client's `agentId` to take ownership.
4. **Invalid Type (Field)**: Attempt to set `balance` as a string.
5. **Resource Poisoning**: Attempt to set a client `name` with a 1MB string.
6. **Negative Payment**: Attempt to record a payment with a negative amount.
7. **Negative Order**: Attempt to create an order with a negative `totalAmount`.
8. **Shadow Field**: Attempt to inject `isVerified: true` into a Client document.
9. **Orphaned Order**: Attempt to create an order for a non-existent client (checked via `exists`).
10. **Timestamp Spoofing**: Attempt to set `createdAt` in the past instead of using `request.time`.
11. **Immutable Violation**: Attempt to change the `clientId` of a Payment after creation.
12. **Blanket Read**: Attempt to list all clients without filtering by `agentId` (should be blocked by query enforcement).

## Test Runner (Logic Overview)
The `firestore.rules` will be tested to ensure all "Dirty Dozen" scenarios return `PERMISSION_DENIED`. I'll use `isValidId` and strict schema validation helpers.
