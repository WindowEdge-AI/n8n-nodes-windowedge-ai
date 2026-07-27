import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class WindowEdgeAiApi implements ICredentialType {
	name = 'windowEdgeAiApi';

	displayName = 'WindowEdge AI Web-Form API';

	icon: Icon = {
		light: 'file:../nodes/WindowEdgeAi/windowedgeai.svg',
		dark: 'file:../nodes/WindowEdgeAi/windowedgeai.dark.svg',
	};

	documentationUrl = 'https://docs.windowedge.ai/docs/form-submissions/overview';

	properties: INodeProperties[] = [
		{
			displayName: 'Web-Form Secret Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'WindowEdge web-form secret key for lead ingestion, usually starting with wf_. Browser or public we_* keys are rejected.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.windowedge.ai',
			required: true,
			description: 'WindowEdge AI API base URL',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/lead-ingestion/connection',
			method: 'GET',
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};
}
