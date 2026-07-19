# Authenticated Events API

## List the authenticated user's events

`GET /api/events` returns events owned by the authenticated Supabase user. The
endpoint validates the access token server-side, requires a verified email, and
derives ownership from the validated user rather than request parameters.

### Request

```http
GET /api/events
Authorization: Bearer <supabase-access-token>
```

### Response

```json
{
  "events": [
    {
      "id": "uuid",
      "name": "Event name",
      "slug": "event-slug",
      "status": "offline",
      "eventAt": null,
      "createdAt": "2026-07-19T12:00:00.000Z",
      "hasPassword": true,
      "entitlement": {
        "plan": "premium",
        "status": "active",
        "viewerLimit": 500,
        "recordingEnabled": true,
        "replayEnabled": true,
        "replayRetentionDays": 30,
        "downloadEnabled": true,
        "streamDurationLimitSeconds": 10800
      },
      "nominatedStreamer": {
        "id": "uuid",
        "email": "streamer@example.com",
        "status": "pending",
        "acceptedAt": null,
        "createdAt": "2026-07-19T12:05:00.000Z"
      },
      "recording": {
        "status": "ready",
        "expiresAt": "2026-08-18T12:00:00.000Z"
      }
    }
  ]
}
```

Events are ordered chronologically by `eventAt`; an event without an event date
uses `createdAt` as its ordering value. `entitlement`, `nominatedStreamer`, and
`recording` are `null` when no corresponding row exists. Password hashes and
other internal database fields are never returned.

### Errors

- `401` when the bearer token is missing, invalid, or belongs to a user without
  a verified email.
- `500` when server credentials are missing or event data cannot be loaded.

## Shared authentication

`authenticateApiRequest()` in `lib/api-auth.ts` extracts the bearer token,
validates it with Supabase Auth, enforces email verification, and returns the
validated user plus an RLS-bound Supabase client. `createServiceRoleClient()`
creates a server-only client for handlers that need privileged aggregate reads.
API handlers must use the validated `user.id`; clients cannot select a user by
supplying an ID.
