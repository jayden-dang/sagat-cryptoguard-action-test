# Multisig Frontend Implementation Plan

## Overview
Building a Sui multisig management interface that connects to our FastAPI backend.

## User Flow States

### 1. Wallet Not Connected
- Show landing page with wallet connect button
- Brief explanation of what the app does
- Connect wallet CTA

### 2. Wallet Connected - First Time User (No Multisigs)
- **Onboarding View**
- Welcome message: "Create your first multisig wallet"
- Educational content about multisigs
- Prominent "Create Multisig" form
- Step-by-step creation flow

### 3. Wallet Connected - Existing User (Has Multisigs)
- **Dashboard View**
- List of user's multisigs (cards/grid)
- Quick stats per multisig:
  - Pending transactions count
  - Threshold info (e.g., "2 of 3")
  - Last activity
- "Create New Multisig" button (secondary)

### 4. Multisig Detail View
- Multisig header with key info
- Transactions tab (default):
  - Pending transactions (top)
  - Executed transactions (below)
  - Transaction cards with approve/execute actions
- Members tab:
  - List of all participants
  - Their addresses and roles
- Settings tab (future):
  - Update threshold
  - Add/remove members

## Technical Architecture

### API Layer Structure
```
/lib/
├── api.ts                 # Raw API client with typed endpoints
├── types.ts              # TypeScript interfaces
└── hooks/
    ├── useUserMultisigs.ts    # Get all multisigs for connected wallet
    ├── useMultisig.ts         # Get single multisig details
    ├── useTransactions.ts     # Get transactions for a multisig
    └── mutations.ts           # All mutations (create, propose, approve, execute)
```

### Component Structure
```
/components/
├── layout/
│   ├── AppLayout.tsx          # Main layout with wallet check
│   └── Navigation.tsx         # Top navigation bar
├── views/
│   ├── OnboardingView.tsx    # First-time user experience
│   ├── Dashboard.tsx          # List of multisigs
│   └── MultisigDetail.tsx    # Single multisig view
├── multisig/
│   ├── MultisigCard.tsx      # Card for dashboard
│   ├── CreateMultisigForm.tsx # Creation form with validation
│   └── MembersList.tsx       # Display members
└── transaction/
    ├── TransactionCard.tsx    # Single transaction display
    ├── ProposeTransactionForm.tsx # New transaction form
    └── TransactionActions.tsx # Approve/Execute buttons
```

## Data Flow

### Initial Load
1. User connects wallet (Mysten dApp Kit)
2. Get wallet address
3. Query `/api/multisigs?participant={address}`
4. If empty → Show onboarding
5. If has multisigs → Show dashboard

### Create Multisig Flow
1. User fills form:
   - Name
   - Threshold
   - Participant addresses (including self)
2. Call Sui SDK to create multisig address
3. POST to `/api/multisigs` with multisig data
4. On success → Redirect to dashboard
5. Invalidate multisigs query

### Transaction Flow
1. **Propose**:
   - Fill form (title, description, transaction data)
   - POST to `/api/multisigs/{id}/transactions`
   - Invalidate transactions query
2. **Approve**:
   - POST to `/api/multisigs/{id}/transactions/{txId}/approve`
   - Optimistic update (show as approved immediately)
   - Invalidate on settlement
3. **Execute** (when threshold met):
   - POST to `/api/multisigs/{id}/transactions/{txId}/execute`
   - Submit to Sui blockchain
   - Update status in backend

## React Query Strategy

### Query Keys
```typescript
['multisigs', address] - User's multisigs
['multisig', multisigId] - Single multisig
['transactions', multisigId] - Multisig's transactions
['transaction', multisigId, txId] - Single transaction
```

### Invalidation Strategy
- After create multisig → Invalidate ['multisigs']
- After propose transaction → Invalidate ['transactions', multisigId]
- After approve → Invalidate ['transaction', multisigId, txId]
- After execute → Invalidate ['transactions', multisigId]

### Optimistic Updates
- Approve transaction → Update UI immediately
- Show loading state on action buttons
- Rollback on error with toast notification

## UI/UX Considerations

### Loading States
- Skeleton loaders for cards
- Spinner for actions
- Suspense boundaries per section

### Error Handling
- Toast notifications for errors (Sonner)
- Inline validation for forms
- Network error recovery

### Empty States
- No multisigs → Show onboarding
- No transactions → "No transactions yet" with CTA
- No pending approvals → "All caught up!"

## Implementation Order

1. **Phase 1: Foundation**
   - API client with types
   - React Query setup
   - Basic routing

2. **Phase 2: Core Flow**
   - Wallet connection check
   - User multisigs query
   - Onboarding vs Dashboard routing

3. **Phase 3: Multisig Management**
   - Create multisig form
   - Multisig list/cards
   - Detail view

4. **Phase 4: Transactions**
   - Transaction list
   - Propose form
   - Approve/Execute actions

5. **Phase 5: Polish**
   - Loading states
   - Error handling
   - Animations
   - Mobile responsive

## Success Metrics
- User can connect wallet ✓
- User can create multisig ✓
- User can view their multisigs ✓
- User can propose transaction ✓
- User can approve transaction ✓
- User can execute transaction ✓
- Proper loading/error states ✓
- Mobile responsive ✓