# Multisig API Documentation

Base URL: `https://api.example.com`

## Authentication

The API uses JWT tokens stored in HTTPOnly cookies. All authenticated endpoints require a valid `connected-wallet` cookie.

### Connect Wallet
```http
POST /auth/connect
```

Signs in with a Sui wallet by verifying a signed message.

**Request Body:**
```json
{
  "publicKey": "AD7s3LJoysMt9hveRdEX1bqVVngVwLLdiRq1jM3jCtTb",
  "signature": "AO8PmazPPw9wEHJLdNO5jQIiRNZSSJzJmkczLjfGaPU7...",
  "expiry": "2024-01-01T12:00:00Z"
}
```

**Response:** `200 OK` (Sets JWT cookie)
```json
{
  "success": true
}
```

### Disconnect Wallet
```http
POST /auth/disconnect
```

Removes a specific public key from the JWT.

**Request Body:**
```json
{
  "publicKey": "AD7s3LJoysMt9hveRdEX1bqVVngVwLLdiRq1jM3jCtTb"
}
```

---

## Addresses

### Register Addresses
```http
POST /addresses
```
🔒 **Requires Authentication**

Registers addresses from all public keys in your JWT.

**Response:** `200 OK`
```json
{
  "success": true
}
```

### Get Connections
```http
GET /addresses/connections
GET /addresses/connections?showPending=true
```
🔒 **Requires Authentication**

Lists your multisig memberships.

**Query Parameters:**
- `showPending` (optional): When `true`, includes both accepted and pending invitations. Default shows only accepted.

**Response:** `200 OK`
```json
{
  "AD7s3LJoysMt9hveRdEX1bqVVngVwLLdiRq1jM3jCtTb": [
    {
      "multisigAddress": "0x7d20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58e",
      "publicKey": "AD7s3LJoysMt9hveRdEX1bqVVngVwLLdiRq1jM3jCtTb",
      "weight": 1,
      "isAccepted": true,
      "order": 0
    }
  ]
}
```

### Get Address Info
```http
GET /addresses/:address
```

Gets the public key for a registered address.

**Response:** `200 OK`
```json
{
  "publicKey": "AD7s3LJoysMt9hveRdEX1bqVVngVwLLdiRq1jM3jCtTb",
  "address": "0x7d20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58e",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

## Multisig

### Create Multisig
```http
POST /multisig
```

Creates a new multisig wallet. Creator is automatically marked as accepted.

**Request Body:**
```json
{
  "publicKey": "AD7s3LJoysMt9hveRdEX1bqVVngVwLLdiRq1jM3jCtTb",
  "addresses": [
    "0x7d20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58e",
    "0x8e20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58f"
  ],
  "weights": [1, 1],
  "threshold": 2,
  "name": "Treasury Multisig"  // optional
}
```

**Validation Rules:**
- Threshold must be > 1
- Threshold must be ≤ sum of weights
- All addresses must be registered in the system
- Creator must be one of the addresses

**Response:** `200 OK`
```json
{
  "multisig": {
    "address": "0x9f20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58g",
    "threshold": 2,
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "members": [
    {
      "multisigAddress": "0x9f20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58g",
      "publicKey": "AD7s3LJoysMt9hveRdEX1bqVVngVwLLdiRq1jM3jCtTb",
      "weight": 1,
      "isAccepted": true,
      "order": 0
    }
  ]
}
```

### Accept Multisig Invitation
```http
POST /multisig/:address/accept
```

Accept an invitation to join a multisig.

**Request Body:**
```json
{
  "publicKey": "AD7s3LJoysMt9hveRdEX1bqVVngVwLLdiRq1jM3jCtTb",
  "signature": "Signature of 'Participating in multisig {address}'"
}
```

**Response:** `200 OK`
```json
{
  "address": "0x9f20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58g",
  "isVerified": true  // true if all members have accepted
}
```

---

## Proposals

### Create Proposal
```http
POST /proposals
```
🔒 **Requires Authentication**

Creates a new proposal for a multisig to sign.

**Request Body:**
```json
{
  "multisigAddress": "0x9f20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58g",
  "transactionBlock": "base64_encoded_transaction_block",
  "description": "Transfer 100 SUI to treasury",  // optional
  "expiresAt": "2024-01-07T00:00:00Z"  // optional, defaults to 7 days
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "multisigAddress": "0x9f20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58g",
  "proposer": "AD7s3LJoysMt9hveRdEX1bqVVngVwLLdiRq1jM3jCtTb",
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00Z",
  "expiresAt": "2024-01-07T00:00:00Z"
}
```

### Sign Proposal
```http
POST /proposals/:id/sign
```

Add your signature to a proposal.

**Request Body:**
```json
{
  "publicKey": "AD7s3LJoysMt9hveRdEX1bqVVngVwLLdiRq1jM3jCtTb",
  "signature": "base64_encoded_signature_of_transaction"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "thresholdMet": true,  // true if enough signatures collected
  "executed": false      // true if transaction was executed on-chain
}
```

### Get Proposal
```http
GET /proposals/:id
```

Get full proposal details including all signatures.

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "multisigAddress": "0x9f20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58g",
  "proposer": "AD7s3LJoysMt9hveRdEX1bqVVngVwLLdiRq1jM3jCtTb",
  "tx": "base64_encoded_transaction",
  "description": "Transfer 100 SUI to treasury",
  "status": "pending",
  "signatures": [
    {
      "publicKey": "AD7s3LJoysMt9hveRdEX1bqVVngVwLLdiRq1jM3jCtTb",
      "signature": "base64_signature",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "expiresAt": "2024-01-07T00:00:00Z"
}
```

### List Proposals
```http
GET /proposals
GET /proposals?multisigAddress=0x...
GET /proposals?status=pending
```

List proposals with optional filters.

**Query Parameters:**
- `multisigAddress` - Filter by multisig
- `status` - Filter by status: `pending`, `signed`, `executed`, `expired`, `cancelled`
- `limit` - Max results (default 50)
- `offset` - Pagination offset

**Response:** `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "multisigAddress": "0x9f20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58g",
    "description": "Transfer 100 SUI to treasury",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

---

## Error Responses

All endpoints may return these error codes:

### 400 Bad Request
```json
{
  "error": "Invalid signature",
  "details": "Signature verification failed"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "Error message for debugging"
}
```

---

## SDK Example

### TypeScript/JavaScript
```typescript
// Initialize client
const client = new MultisigClient({
  baseUrl: 'https://api.example.com',
});

// Authenticate
await client.auth.connect({
  publicKey: keypair.getPublicKey().toBase64(),
  signature: await signMessage(keypair, message),
  expiry: new Date(Date.now() + 30 * 60 * 1000).toISOString()
});

// Create multisig
const multisig = await client.multisig.create({
  publicKey: keypair.getPublicKey().toBase64(),
  addresses: [addr1, addr2],
  weights: [1, 1],
  threshold: 2
});

// Create proposal
const proposal = await client.proposals.create({
  multisigAddress: multisig.address,
  transactionBlock: txb.serialize(),
  description: 'Payment to vendor'
});

// Sign proposal
await client.proposals.sign(proposal.id, {
  publicKey: keypair.getPublicKey().toBase64(),
  signature: await signTransaction(keypair, txb)
});
```

### cURL Examples
```bash
# Connect wallet
curl -X POST https://api.example.com/auth/connect \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "AD7s3LJoysMt9hveRdEX1bqVVngVwLLdiRq1jM3jCtTb",
    "signature": "AO8PmazPPw9wEHJLdNO5jQIiRNZSSJzJmkczLjfGaPU7...",
    "expiry": "2024-01-01T12:00:00Z"
  }'

# List proposals (with cookie)
curl https://api.example.com/proposals?status=pending \
  -H "Cookie: connected-wallet=..."
```

---

## Rate Limits

- **Authentication endpoints**: 10 requests per minute
- **Read endpoints**: 100 requests per minute
- **Write endpoints**: 30 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`