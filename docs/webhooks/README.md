# Webhook Notifications

Real-time event notifications via HTTP webhooks for CSV import jobs and OneRoster entity changes.

## Overview

RosterHub supports webhook notifications to keep external systems synchronized with data changes. When subscribed events occur, RosterHub sends HTTP POST requests to your configured webhook endpoint with event payloads.

## Features

- **Event Subscriptions**: Subscribe to specific event types (CSV import, entity changes)
- **Secure Delivery**: HMAC-SHA256 signature for payload verification
- **Automatic Retries**: Exponential backoff retry mechanism (up to 10 retries)
- **Delivery Tracking**: Full delivery history with success/failure status
- **Statistics**: Success rate and delivery analytics per webhook
- **Organization Scoping**: Webhooks scoped to specific organizations

## Supported Events

| Event Type | Trigger | Payload |
|------------|---------|---------|
| `csv_import_processing` | CSV import job starts processing | Job ID, entity type, file name, progress |
| `csv_import_completed` | CSV import job completes successfully | Job ID, success/failure counts, duration |
| `csv_import_failed` | CSV import job fails | Job ID, error messages, failed records |
| `entity_created` | OneRoster entity created via API | Entity type, sourcedId, data |
| `entity_updated` | OneRoster entity updated via API | Entity type, sourcedId, changes |
| `entity_deleted` | OneRoster entity deleted via API | Entity type, sourcedId |

## Quick Start

### 1. Register a Webhook

```bash
curl -X POST https://api.rosterhub.example.com/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.example.com/webhooks/rosterhub",
    "events": ["csv_import_completed", "csv_import_failed"],
    "organizationId": "org-12345",
    "maxRetries": 3,
    "retryBackoff": 60
  }'
```

**Response:**
```json
{
  "id": "webhook-abc123",
  "url": "https://your-app.example.com/webhooks/rosterhub",
  "events": ["csv_import_completed", "csv_import_failed"],
  "secret": "whsec_a1b2c3d4e5f6...",
  "isActive": true,
  "organizationId": "org-12345",
  "maxRetries": 3,
  "retryBackoff": 60,
  "createdAt": "2025-11-16T12:00:00Z",
  "updatedAt": "2025-11-16T12:00:00Z"
}
```

**Important**: Save the `secret` value returned in the response. You'll need it to verify webhook signatures. The secret is only shown once and cannot be retrieved later.

### 2. Receive Webhook Events

Create an endpoint in your application to receive webhook events:

```typescript
// Express.js example
app.post('/webhooks/rosterhub', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const event = req.headers['x-webhook-event'];
  const deliveryId = req.headers['x-webhook-delivery-id'];
  const payload = req.body;

  // Verify signature (see "Verifying Signatures" section)
  if (!verifySignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process event
  console.log(`Received event: ${event}`, payload);

  // Acknowledge receipt (return 2xx status code)
  res.status(200).json({ received: true });
});
```

### 3. Verify Webhook Signatures

Always verify the HMAC signature to ensure the webhook came from RosterHub:

```typescript
import * as crypto from 'crypto';

function verifySignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Event Payloads

### CSV Import Completed

Triggered when a CSV import job finishes successfully.

```json
{
  "event": "csv_import_completed",
  "timestamp": "2025-11-16T12:30:00Z",
  "data": {
    "jobId": "job-abc123",
    "entityType": "users",
    "fileName": "users-20251116.csv",
    "status": "completed",
    "totalRecords": 10000,
    "processedRecords": 10000,
    "successRecords": 9950,
    "failedRecords": 50,
    "startedAt": "2025-11-16T12:00:00Z",
    "completedAt": "2025-11-16T12:30:00Z"
  }
}
```

### CSV Import Failed

Triggered when a CSV import job fails.

```json
{
  "event": "csv_import_failed",
  "timestamp": "2025-11-16T12:15:00Z",
  "data": {
    "jobId": "job-xyz789",
    "entityType": "enrollments",
    "fileName": "enrollments-20251116.csv",
    "status": "failed",
    "totalRecords": 50000,
    "processedRecords": 12500,
    "errors": [
      {
        "row": 105,
        "field": "userSourcedId",
        "message": "Referenced user not found: user-12345"
      },
      {
        "row": 238,
        "field": "classSourcedId",
        "message": "Referenced class not found: class-67890"
      }
    ],
    "startedAt": "2025-11-16T12:00:00Z",
    "completedAt": "2025-11-16T12:15:00Z"
  }
}
```

### Entity Created

Triggered when a OneRoster entity is created via API.

```json
{
  "event": "entity_created",
  "timestamp": "2025-11-16T12:00:00Z",
  "data": {
    "entityType": "User",
    "sourcedId": "user-12345",
    "action": "created",
    "data": {
      "sourcedId": "user-12345",
      "givenName": "Taro",
      "familyName": "Tanaka",
      "role": "student",
      "email": "taro.tanaka@example.jp"
    }
  }
}
```

### Entity Updated

Triggered when a OneRoster entity is updated via API.

```json
{
  "event": "entity_updated",
  "timestamp": "2025-11-16T12:05:00Z",
  "data": {
    "entityType": "User",
    "sourcedId": "user-12345",
    "action": "updated",
    "data": {
      "sourcedId": "user-12345",
      "email": "new.email@example.jp"
    }
  }
}
```

## API Reference

### POST /api/v1/webhooks

Register a new webhook subscription.

**Request Body:**
```json
{
  "url": "https://your-app.example.com/webhooks",
  "events": ["csv_import_completed"],
  "organizationId": "org-12345",
  "maxRetries": 3,
  "retryBackoff": 60
}
```

**Parameters:**
- `url` (required): HTTPS endpoint to receive webhooks
- `events` (required): Array of event types to subscribe to
- `organizationId` (required): Organization ID
- `maxRetries` (optional): Maximum retry attempts (0-10, default: 3)
- `retryBackoff` (optional): Initial retry delay in seconds (10-3600, default: 60)

### GET /api/v1/webhooks

List webhooks for an organization.

**Query Parameters:**
- `organizationId` (required): Organization ID

### GET /api/v1/webhooks/:id

Get webhook details by ID.

### PUT /api/v1/webhooks/:id

Update webhook configuration.

**Request Body:**
```json
{
  "url": "https://new-url.example.com/webhooks",
  "events": ["csv_import_completed", "csv_import_failed"],
  "isActive": true,
  "maxRetries": 5
}
```

### DELETE /api/v1/webhooks/:id

Delete a webhook subscription.

### GET /api/v1/webhooks/:id/deliveries

Get delivery history for a webhook.

**Query Parameters:**
- `limit` (optional): Maximum number of deliveries to return (default: 50)

**Response:**
```json
[
  {
    "id": "delivery-123",
    "webhookId": "webhook-abc",
    "event": "csv_import_completed",
    "status": "success",
    "attempts": 1,
    "responseStatus": 200,
    "createdAt": "2025-11-16T12:00:00Z",
    "completedAt": "2025-11-16T12:00:05Z"
  }
]
```

### GET /api/v1/webhooks/:id/stats

Get delivery statistics for a webhook.

**Response:**
```json
{
  "total": 1000,
  "success": 985,
  "failed": 10,
  "pending": 5,
  "successRate": 98.5
}
```

## Retry Behavior

### Retry Strategy

When a webhook delivery fails (non-2xx response or network error), RosterHub automatically retries with exponential backoff:

- **Attempt 1**: Immediate
- **Attempt 2**: After `retryBackoff` seconds (default: 60s)
- **Attempt 3**: After `retryBackoff * 2` seconds (default: 120s)
- **Attempt 4**: After `retryBackoff * 4` seconds (default: 240s)
- **Attempt N**: After `retryBackoff * 2^(N-1)` seconds

### Maximum Retries

Configure `maxRetries` (0-10) when registering the webhook. Default is 3 retries.

### Retry Conditions

Retries occur when:
- HTTP status code is not 2xx (200-299)
- Network timeout (10 seconds)
- Connection refused
- DNS resolution failure

### Acknowledgment

Your webhook endpoint must return a `2xx` status code within 10 seconds to acknowledge successful receipt. Any other response or timeout will trigger a retry.

## Best Practices

### 1. Verify Signatures

**Always verify the HMAC signature** to ensure webhook authenticity:

```typescript
const isValid = verifySignature(req.body, req.headers['x-webhook-signature'], secret);
if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### 2. Return 2xx Quickly

Process webhooks asynchronously. Acknowledge receipt immediately (return 2xx) and process the event in the background:

```typescript
app.post('/webhooks/rosterhub', async (req, res) => {
  // Verify signature
  if (!verifySignature(req.body, req.headers['x-webhook-signature'], secret)) {
    return res.status(401).send();
  }

  // Acknowledge immediately
  res.status(200).json({ received: true });

  // Process asynchronously
  await queue.add('process-webhook', { payload: req.body });
});
```

### 3. Implement Idempotency

Use the `X-Webhook-Delivery-ID` header to deduplicate retries:

```typescript
const deliveryId = req.headers['x-webhook-delivery-id'];

if (await isProcessed(deliveryId)) {
  return res.status(200).json({ received: true }); // Already processed
}

await processWebhook(req.body);
await markProcessed(deliveryId);
```

### 4. Use HTTPS

Webhook URLs must use HTTPS in production to protect payload confidentiality.

### 5. Monitor Delivery Stats

Check webhook delivery statistics regularly:

```bash
curl https://api.rosterhub.example.com/api/v1/webhooks/webhook-abc/stats \
  -H "Authorization: Bearer YOUR_API_KEY"
```

If success rate is below 95%, investigate delivery failures.

### 6. Handle Replay Attacks

Store delivery IDs and reject duplicates:

```typescript
const redis = require('redis');
const client = redis.createClient();

async function isDuplicate(deliveryId: string): Promise<boolean> {
  const exists = await client.exists(`webhook:${deliveryId}`);
  if (exists) return true;

  await client.set(`webhook:${deliveryId}`, '1', 'EX', 86400); // 24 hour TTL
  return false;
}
```

## Security Considerations

### Signature Verification

**Critical**: Always verify HMAC-SHA256 signatures using `crypto.timingSafeEqual()` to prevent timing attacks:

```typescript
function verifySignature(payload: any, signature: string, secret: string): boolean {
  const expected = generateSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### IP Whitelisting

For additional security, configure firewall rules to only allow webhook requests from RosterHub IP addresses:

```
# RosterHub webhook delivery IPs
203.0.113.10
203.0.113.11
203.0.113.12
```

Contact support for the current IP whitelist.

### Secret Rotation

Rotate webhook secrets periodically:

1. Register a new webhook with new URL/secret
2. Deploy updated secret to your application
3. Delete the old webhook
4. Monitor deliveries on new webhook

### Rate Limiting

Implement rate limiting on your webhook endpoint to prevent abuse:

```typescript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
});

app.post('/webhooks/rosterhub', limiter, handleWebhook);
```

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook is active**:
   ```bash
   GET /api/v1/webhooks/:id
   # Verify isActive: true
   ```

2. **Verify event subscription**:
   ```bash
   GET /api/v1/webhooks/:id
   # Check events array includes expected event type
   ```

3. **Check delivery history**:
   ```bash
   GET /api/v1/webhooks/:id/deliveries
   # Look for failed deliveries and error messages
   ```

### Deliveries Failing

1. **Check endpoint accessibility**:
   ```bash
   curl -X POST https://your-app.example.com/webhooks \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

2. **Verify SSL certificate**:
   ```bash
   openssl s_client -connect your-app.example.com:443
   ```

3. **Check response time**:
   Webhook endpoints must respond within 10 seconds. Implement async processing if needed.

4. **Review server logs**:
   Check your application logs for errors or exceptions.

### Signature Verification Failing

1. **Use exact payload**: Verify signature against the raw request body, not parsed JSON:
   ```typescript
   // Correct
   app.use(express.raw({ type: 'application/json' }));
   const isValid = verifySignature(req.body, signature, secret);

   // Incorrect
   app.use(express.json());
   const isValid = verifySignature(req.body, signature, secret); // Fails!
   ```

2. **Check secret**: Ensure you're using the correct webhook secret from registration response.

3. **Verify signature format**: Signature header format is `sha256=<hex_digest>`.

## Examples

### Node.js + Express

```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();
const WEBHOOK_SECRET = 'whsec_...'; // From registration response

app.use(express.json());

app.post('/webhooks/rosterhub', (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const event = req.headers['x-webhook-event'] as string;

  // Verify signature
  if (!verifySignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process event
  console.log(`Event: ${event}`, req.body);

  // Acknowledge
  res.status(200).json({ received: true });
});

function verifySignature(payload: any, signature: string, secret: string): boolean {
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  const expected = `sha256=${hmac.digest('hex')}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.listen(3000);
```

### Python + Flask

```python
import hmac
import hashlib
import json
from flask import Flask, request

app = Flask(__name__)
WEBHOOK_SECRET = 'whsec_...'  # From registration response

@app.route('/webhooks/rosterhub', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    event = request.headers.get('X-Webhook-Event')
    payload = request.get_json()

    # Verify signature
    if not verify_signature(payload, signature, WEBHOOK_SECRET):
        return {'error': 'Invalid signature'}, 401

    # Process event
    print(f'Event: {event}', payload)

    # Acknowledge
    return {'received': True}, 200

def verify_signature(payload, signature, secret):
    payload_string = json.dumps(payload, separators=(',', ':'))
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        payload_string.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)

if __name__ == '__main__':
    app.run(port=3000)
```

## Support

For webhook-related issues:
- Check delivery history: `GET /api/v1/webhooks/:id/deliveries`
- Review statistics: `GET /api/v1/webhooks/:id/stats`
- Contact support: support@rosterhub.example.com

## Rate Limits

- **Webhook Registration**: 100 webhooks per organization
- **Delivery Attempts**: Up to 10 retries per delivery
- **Concurrent Deliveries**: 10 concurrent webhook deliveries per organization
