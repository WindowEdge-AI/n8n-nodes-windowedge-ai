# @windowedge/n8n-nodes-windowedge-ai

n8n community node for sending leads into WindowEdge AI lead ingestion.

## Package status

This package is scaffolded for the scoped npm name `@windowedge/n8n-nodes-windowedge-ai`. n8n community packages may use scoped names when the package segment starts with `n8n-nodes-`, so the scoped name is feasible and preferred for WindowEdge ownership. If npm scope permissions ever block publishing, the fallback package name is `n8n-nodes-windowedge-ai`.

## Features

- Credential type for a WindowEdge web-form secret key.
- Optional API base URL, defaulting to `https://api.windowedge.ai`.
- Credential test against `GET /api/v1/lead-ingestion/connection`.
- `WindowEdge AI` node with `Lead` resource and `Create Lead` operation.
- Lead contact, address, outreach, SMS opt-in, attribution, routing, custom fields, and test mode fields.
- Request body pruning for empty strings and empty objects.
- No runtime dependencies.

## Installation

In a self-hosted n8n instance, install the package from the community nodes UI after it is published to npm:

```text
@windowedge/n8n-nodes-windowedge-ai
```

For local development:

```bash
npm install
npm run build
npm run dev
```

## Credentials

Create a `WindowEdge AI Web-Form API` credential:

- `Web-Form Secret Key`: Your WindowEdge web-form lead ingestion secret key, usually starting with `wf_`.
- `Base URL`: Defaults to `https://api.windowedge.ai`.

Do not use a browser or public `we_*` key. The lead ingestion API requires a secret web-form key and rejects public keys.

The credential test calls:

```http
GET /api/v1/lead-ingestion/connection
Authorization: Bearer <api-key>
```

## Usage

1. Add the `WindowEdge AI` node to a workflow.
2. Select `Lead` as the resource.
3. Select `Create Lead` as the operation.
4. Set the required `Phone` field.
5. Add optional first name, last name, email, lead address, SMS opt-in, attribution, custom fields, and routing fields.
6. Choose `AI Generated` message mode to let WindowEdge AI generate outreach, or `Static` and provide `Message`.
7. Execute the node.

The node posts to:

```http
POST /api/v1/lead-ingestion/leads
Authorization: Bearer <wf-secret-key>
Content-Type: application/json
```

The request body uses the platform lead ingestion contract, with empty strings and empty objects removed:

```json
{
  "lead": {
    "phone": "+15551234567",
    "first_name": "Ava",
    "last_name": "Johnson",
    "email": "ava@example.com",
    "address": "123 Main St",
    "city": "Denver",
    "state": "CO",
    "zip": "80202"
  },
  "outreach": {
    "mode": "static",
    "message": "Thanks for requesting a quote. Our team will follow up shortly.",
    "sms_opt_in": true,
    "sms_opt_in_language": "I agree to receive SMS updates from WindowEdge."
  },
  "attribution": {
    "source_lead_id": "lead-123",
    "channel": "google",
    "campaign": "spring-windows",
    "url_parameters": "utm_source=google&utm_campaign=spring-windows",
    "external_cms_id": "cms-456"
  },
  "routing": {
    "from": "+15557654321",
    "agent_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "custom_fields": {
    "form_id": "homepage_quote",
    "project_type": "windows"
  },
  "test": false
}
```

## Development

```bash
npm install
npm run lint
npm test
npm run build
```

`npm test` builds the package and runs request-shaping tests against the compiled output.

## Publishing

The package includes `.github/workflows/publish.yml` as a publish workflow skeleton. It is tag-triggered and uses:

```bash
npm publish --provenance --access public
```

For n8n verified community-node submission, configure npm Trusted Publisher for:

- npm package: `@windowedge/n8n-nodes-windowedge-ai`
- GitHub owner: `WindowEdge-AI`
- GitHub repository: `n8n-nodes-windowedge-ai`
- Workflow: `publish.yml`

Do not publish until package ownership, API contract, and production credentials have been verified.

## Troubleshooting

### Credential test fails

- Confirm the API key is active.
- Confirm the API key is a secret web-form key, usually `wf_*`, not a public browser `we_*` key.
- Confirm the base URL has no path suffix.
- Confirm the WindowEdge AI API allows the source n8n host.

### Lead creation returns validation errors

- Confirm `Phone` is present and formatted as a real phone number.
- If `Message Mode` is `Static`, confirm `Message` is not blank.
- Confirm `Custom Fields` keys are not blank.
- Confirm `Custom JSON` is a JSON object, not an array or scalar.

### Node does not appear in n8n

- Confirm the package is installed in a self-hosted n8n instance.
- Restart n8n after installation if your deployment does not reload community packages automatically.
- Confirm community nodes are enabled in your n8n settings.

## Support

Open an issue at https://github.com/WindowEdge-AI/n8n-nodes-windowedge-ai/issues or contact WindowEdge AI support with the workflow execution ID and the API response body.
