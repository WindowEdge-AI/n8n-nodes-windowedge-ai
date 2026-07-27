# WindowEdge AI for n8n

This is an n8n community node for sending lead submissions into WindowEdge AI.
[n8n](https://n8n.io/) is a workflow automation platform.

- [Installation](#installation)
- [Operations](#operations)
- [Credentials](#credentials)
- [Compatibility](#compatibility)
- [Usage](#usage)
- [Example workflow](#example-workflow)
- [Development](#development)
- [Publishing](#publishing)
- [Resources](#resources)
- [Version history](#version-history)

## Installation

After the package is published to npm, install it from the n8n community nodes interface:

```text
@windowedge/n8n-nodes-windowedge-ai
```

Follow the [n8n community-node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Operations

### Lead

- **Create**: Send a new lead to WindowEdge AI for ingestion and optional outreach.

The operation supports contact information, address details, outreach mode, SMS consent,
attribution, routing, custom fields, and test mode.

## Credentials

Create a **WindowEdge AI Web-Form API** credential with:

- **Web-Form Secret Key**: A secret WindowEdge lead-ingestion key, usually beginning with
  `wf_`.
- **Base URL**: Keep the default `https://api.windowedge.ai` unless WindowEdge support
  provides a different API host.

Do not use a browser or public `we_*` key. Public keys are not accepted by this endpoint.

The credential test sends an authenticated request to:

```http
GET /api/v1/lead-ingestion/connection
```

## Compatibility

- Target n8n version: n8n 2.x.
- Build-time workflow types: `n8n-workflow` 2.16.0.
- Development runtime: Node.js 22.22.0 or later.
- n8n 1.x is not tested or supported by this package.

## Usage

1. Add the **WindowEdge AI** node to a workflow.
2. Select the **Lead** resource and **Create** operation.
3. Select a WindowEdge credential.
4. Enter the lead phone number.
5. Choose **AI Generated** or **Static** outreach.
6. Add optional lead, attribution, routing, and custom fields.
7. Execute the workflow.

### SMS consent

**SMS Opt-In** defaults to `false`. Set it to `true` only when the lead affirmatively
consented to SMS outreach. Store the disclosure shown to the lead in **SMS Opt-In Language**.

### Tenant routing options

The **Business Phone** and **SMS Agent** fields load enabled options for the authenticated
tenant from WindowEdge AI. If the list cannot be loaded or the desired value is not listed,
switch the field to **By Phone Number** or **By ID** and enter the value manually.

### Request endpoint

The node posts to:

```http
POST /api/v1/lead-ingestion/leads
Authorization: Bearer <wf-secret-key>
Content-Type: application/json
```

Empty strings and empty objects are removed before the request is sent. The resulting body
uses the `lead`, `outreach`, `attribution`, `routing`, `custom_fields`, and `test` fields.

## Example workflow

Import [`examples/create-test-lead.workflow.json`](examples/create-test-lead.workflow.json)
into n8n. Before executing it:

1. Replace the example phone number with a sanctioned test destination.
2. Select a WindowEdge credential.
3. Keep **Test Lead** enabled.
4. Review the SMS consent value before execution.

The example does not contain credentials or secrets.

## Development

```bash
npm install
npm run lint
npm test
npm run build
npm pack --dry-run
```

`npm test` builds the package and runs focused tests against the compiled output.

## Publishing

Publishing is tag-triggered through `.github/workflows/publish.yml`. The workflow:

1. Confirms the Git tag matches `package.json` exactly, allowing an optional `v` prefix.
2. Installs dependencies with `npm ci`.
3. Runs lint, tests, build, and an npm package dry run.
4. Publishes with an npm provenance statement.

n8n requires Creator Portal submissions to be published from GitHub Actions with
provenance. Configure npm Trusted Publisher for `publish.yml`, or use a package-scoped
granular `NPM_TOKEN` for the first publish.

## Resources

- [WindowEdge form submissions](https://docs.windowedge.ai/docs/form-submissions/overview)
- [WindowEdge tracking and lead capture](https://docs.windowedge.ai/docs/marketing-setup/tracking-and-capture)
- [WindowEdge documentation](https://docs.windowedge.ai/)
- [n8n community nodes](https://docs.n8n.io/integrations/community-nodes/)
- [n8n community-node verification](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines)

## Version history

- **0.1.0**: Initial lead-ingestion node with credential testing, tenant routing choices,
  manual routing fallback, test mode, and explicit SMS consent handling.

## License

[MIT](LICENSE.md)
