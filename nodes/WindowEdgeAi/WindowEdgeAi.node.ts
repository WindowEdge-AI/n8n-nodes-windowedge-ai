import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	JsonObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	buildLeadIngestionBody,
	type LeadIngestionInput,
	parseCustomFields,
	parseCustomJson,
} from './GenericFunctions';

function toJsonObject(error: unknown): JsonObject {
	if (typeof error === 'object' && error !== null) {
		try {
			const parsed = JSON.parse(JSON.stringify(error)) as JsonObject | undefined;

			if (parsed !== undefined && Object.keys(parsed).length > 0) {
				return parsed;
			}
		} catch {
			if (!(error instanceof Error)) {
				return {
					message: 'Unable to serialize API error.',
				};
			}
		}
	}

	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
		};
	}

	return {
		message: String(error),
	};
}

export class WindowEdgeAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WindowEdge AI',
		name: 'windowEdgeAi',
		icon: { light: 'file:windowedgeai.svg', dark: 'file:windowedgeai.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send leads into WindowEdge AI',
		defaults: {
			name: 'WindowEdge AI',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'windowEdgeAiApi',
				required: true,
			},
		],
		requestDefaults: {
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Lead',
						value: 'lead',
					},
				],
				default: 'lead',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['lead'],
					},
				},
				options: [
					{
						name: 'Create Lead',
						value: 'createLead',
						action: 'Create a lead',
					},
				],
				default: 'createLead',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				required: true,
				default: '',
				placeholder: '+15551234567',
				description: 'Lead phone number in E.164 format when possible',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['createLead'],
					},
				},
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['createLead'],
					},
				},
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['createLead'],
					},
				},
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'lead@example.com',
				default: '',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['createLead'],
					},
				},
			},
			{
				displayName: 'Message Mode',
				name: 'messageMode',
				type: 'options',
				options: [
					{
						name: 'AI Generated',
						value: 'ai_generated',
					},
					{
						name: 'Static',
						value: 'static',
					},
				],
				default: 'ai_generated',
				description: 'Whether WindowEdge AI should generate outreach or use a supplied static message',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['createLead'],
					},
				},
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				required: true,
				default: '',
				description: 'Static message to send when Message Mode is Static',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['createLead'],
						messageMode: ['static'],
					},
				},
			},
			{
				displayName: 'Lead Details',
				name: 'leadDetails',
				type: 'collection',
				placeholder: 'Add Lead Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['createLead'],
					},
				},
				options: [
					{
						displayName: 'Address',
						name: 'address',
						type: 'string',
						default: '',
						description: 'Lead street address',
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
					},
					{
						displayName: 'State',
						name: 'state',
						type: 'string',
						default: '',
					},
					{
						displayName: 'ZIP / Postal Code',
						name: 'zip',
						type: 'string',
						default: '',
					},
				],
			},
			{
				displayName: 'SMS Opt-In',
				name: 'sms',
				type: 'collection',
				placeholder: 'Add SMS Opt-In Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['createLead'],
					},
				},
				options: [
					{
						displayName: 'SMS Opt-In',
						name: 'smsOptIn',
						type: 'boolean',
						default: true,
						description: 'Whether the lead explicitly opted in to SMS outreach',
					},
					{
						displayName: 'SMS Opt-In Language',
						name: 'smsOptInLanguage',
						type: 'string',
						default: '',
						description: 'Consent disclosure text shown to the lead',
					},
				],
			},
			{
				displayName: 'Attribution',
				name: 'attribution',
				type: 'collection',
				placeholder: 'Add Attribution Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['createLead'],
					},
				},
				options: [
					{
						displayName: 'Campaign',
						name: 'attributionCampaign',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Channel',
						name: 'channel',
						type: 'string',
						default: '',
						placeholder: 'google, facebook, website, referral',
					},
					{
						displayName: 'External CMS ID',
						name: 'externalCmsId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Source Lead ID',
						name: 'sourceLeadId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'URL Parameters',
						name: 'urlParameters',
						type: 'string',
						default: '',
						placeholder: 'utm_source=google&utm_campaign=spring-windows',
					},
				],
			},
			{
				displayName: 'Custom Fields',
				name: 'customFields',
				type: 'fixedCollection',
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: 'Additional metadata sent as custom_fields on the lead ingestion request',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['createLead'],
					},
				},
				options: [
					{
						displayName: 'Field',
						name: 'fields',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Advanced',
				name: 'advanced',
				type: 'collection',
				placeholder: 'Add Advanced Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['createLead'],
					},
				},
				options: [
					{
						displayName: 'Agent ID',
						name: 'agentId',
						type: 'string',
						default: '',
						description: 'Specific WindowEdge AI SMS agent UUID to route this lead to',
					},
					{
						displayName: 'Business Phone',
						name: 'from',
						type: 'string',
						default: '',
						description: 'Tenant business phone number to send from',
					},
					{
						displayName: 'Custom JSON',
						name: 'customJson',
						type: 'json',
						default: '{}',
						description: 'Additional custom_fields metadata as a JSON object',
					},
					{
						displayName: 'Test Lead',
						name: 'testLead',
						type: 'boolean',
						default: false,
						description: 'Whether to mark this request as a test lead',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('windowEdgeAiApi');
		const baseUrl = String(credentials.baseUrl ?? 'https://api.windowedge.ai').replace(/\/+$/, '');

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const phone = this.getNodeParameter('phone', itemIndex, '') as string;
				const messageMode = this.getNodeParameter(
					'messageMode',
					itemIndex,
					'ai_generated',
				) as LeadIngestionInput['messageMode'];
				const message = this.getNodeParameter('message', itemIndex, '') as string;

				if (messageMode === 'static' && message.trim() === '') {
					throw new NodeOperationError(this.getNode(), 'Message is required for static mode.', {
						itemIndex,
					});
				}

				const leadDetails = this.getNodeParameter('leadDetails', itemIndex, {}) as IDataObject;
				const sms = this.getNodeParameter('sms', itemIndex, {}) as IDataObject;
				const attribution = this.getNodeParameter('attribution', itemIndex, {}) as IDataObject;
				const customFieldsInput = this.getNodeParameter(
					'customFields',
					itemIndex,
					{},
				) as IDataObject;
				const advanced = this.getNodeParameter('advanced', itemIndex, {}) as IDataObject;

				const customFields = parseCustomFields(customFieldsInput);
				const custom = parseCustomJson(advanced.customJson);
				const body = buildLeadIngestionBody({
					phone,
					first_name: this.getNodeParameter('first_name', itemIndex, '') as string,
					last_name: this.getNodeParameter('last_name', itemIndex, '') as string,
					email: this.getNodeParameter('email', itemIndex, '') as string,
					messageMode,
					message,
					address: leadDetails.address as string | undefined,
					city: leadDetails.city as string | undefined,
					state: leadDetails.state as string | undefined,
					zip: leadDetails.zip as string | undefined,
					smsOptIn: sms.smsOptIn as boolean | undefined,
					smsOptInLanguage: sms.smsOptInLanguage as string | undefined,
					sourceLeadId: attribution.sourceLeadId as string | undefined,
					channel: attribution.channel as string | undefined,
					attributionCampaign: attribution.attributionCampaign as string | undefined,
					urlParameters: attribution.urlParameters as string | undefined,
					externalCmsId: attribution.externalCmsId as string | undefined,
					from: advanced.from as string | undefined,
					agentId: advanced.agentId as string | undefined,
					custom,
					customFields,
					test: advanced.testLead as boolean | undefined,
				});

				const options: IHttpRequestOptions = {
					method: 'POST',
					url: `${baseUrl}/api/v1/lead-ingestion/leads`,
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
					},
					body,
					json: true,
				};

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'windowEdgeAiApi',
					options,
				)) as IDataObject;

				returnData.push({
					json: response,
					pairedItem: {
						item: itemIndex,
					},
				});
			} catch (error) {
				const executionError =
					error instanceof NodeOperationError || error instanceof NodeApiError
						? error
						: error instanceof Error &&
							  (error.message.includes('Custom JSON') ||
									error.message.includes('Custom fields'))
							? new NodeOperationError(this.getNode(), error.message, {
									itemIndex,
								})
							: new NodeApiError(this.getNode(), toJsonObject(error), {
									itemIndex,
								});

				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: executionError.message,
						},
						error: executionError,
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}

				throw executionError;
			}
		}

		return [returnData];
	}
}
