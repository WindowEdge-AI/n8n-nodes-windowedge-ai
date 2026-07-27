import type { IDataObject } from 'n8n-workflow';

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| {
			[key: string]: JsonValue;
	  };

export interface LeadIngestionInput {
	phone: string;
	first_name?: string;
	last_name?: string;
	email?: string;
	address?: string;
	messageMode: 'ai_generated' | 'static';
	message?: string;
	city?: string;
	state?: string;
	zip?: string;
	smsOptIn?: boolean;
	smsOptInLanguage?: string;
	sourceLeadId?: string;
	channel?: string;
	attributionCampaign?: string;
	urlParameters?: string;
	externalCmsId?: string;
	from?: string;
	agentId?: string;
	custom?: IDataObject;
	customFields?: IDataObject;
	test?: boolean;
}

export interface ListSearchItem {
	name: string;
	value: string;
}

function isPlainObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function matchesFilter(values: Array<string | undefined>, filter?: string): boolean {
	const normalizedFilter = filter?.trim().toLowerCase();

	if (!normalizedFilter) {
		return true;
	}

	return values.some((value) => value?.toLowerCase().includes(normalizedFilter));
}

export function normalizeBaseUrl(value: unknown): string {
	const baseUrl = typeof value === 'string' ? value.trim() : '';
	return (baseUrl || 'https://api.windowedge.ai').replace(/\/+$/, '');
}

export function resourceLocatorValue(value: unknown): string | undefined {
	if (typeof value === 'string') {
		const normalized = value.trim();
		return normalized === '' ? undefined : normalized;
	}

	if (!isPlainObject(value) || typeof value.value !== 'string') {
		return undefined;
	}

	const normalized = value.value.trim();
	return normalized === '' ? undefined : normalized;
}

export function businessPhoneSearchResults(
	response: unknown,
	filter?: string,
): ListSearchItem[] {
	if (!isPlainObject(response) || !Array.isArray(response.business_phones)) {
		return [];
	}

	const seen = new Set<string>();
	const results: ListSearchItem[] = [];

	for (const rawPhone of response.business_phones) {
		if (!isPlainObject(rawPhone) || typeof rawPhone.phone_number !== 'string') {
			continue;
		}

		const phoneNumber = rawPhone.phone_number.trim();
		const label = typeof rawPhone.label === 'string' ? rawPhone.label.trim() : '';
		const id = typeof rawPhone.id === 'string' ? rawPhone.id.trim() : '';

		if (
			phoneNumber === '' ||
			seen.has(phoneNumber) ||
			!matchesFilter([phoneNumber, label, id], filter)
		) {
			continue;
		}

		seen.add(phoneNumber);
		results.push({
			name: `${label ? `${label} (${phoneNumber})` : phoneNumber}${
				rawPhone.is_default === true ? ' - Default' : ''
			}`,
			value: phoneNumber,
		});
	}

	return results;
}

export function smsAgentSearchResults(response: unknown, filter?: string): ListSearchItem[] {
	if (!isPlainObject(response) || !Array.isArray(response.sms_agents)) {
		return [];
	}

	const seen = new Set<string>();
	const results: ListSearchItem[] = [];

	for (const rawAgent of response.sms_agents) {
		if (!isPlainObject(rawAgent) || typeof rawAgent.id !== 'string') {
			continue;
		}

		const id = rawAgent.id.trim();
		const label = typeof rawAgent.label === 'string' ? rawAgent.label.trim() : '';

		if (id === '' || seen.has(id) || !matchesFilter([id, label], filter)) {
			continue;
		}

		seen.add(id);
		results.push({
			name: label || id,
			value: id,
		});
	}

	return results;
}

export function pruneEmpty(value: unknown): unknown {
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed === '' ? undefined : trimmed;
	}

	if (Array.isArray(value)) {
		const items = value
			.map((item) => pruneEmpty(item))
			.filter((item) => item !== undefined) as unknown[];

		return items.length === 0 ? undefined : items;
	}

	if (isPlainObject(value)) {
		const entries = Object.entries(value)
			.map(([key, item]) => [key, pruneEmpty(item)] as const)
			.filter(([, item]) => item !== undefined);

		if (entries.length === 0) {
			return undefined;
		}

		return Object.fromEntries(entries);
	}

	if (value === null || value === undefined) {
		return undefined;
	}

	return value;
}

export function parseCustomJson(rawValue: unknown): IDataObject | undefined {
	if (rawValue === undefined || rawValue === null || rawValue === '') {
		return undefined;
	}

	if (isPlainObject(rawValue)) {
		return rawValue;
	}

	if (typeof rawValue !== 'string') {
		throw new Error('Custom JSON must be a JSON object.');
	}

	const parsed = JSON.parse(rawValue) as unknown;

	if (!isPlainObject(parsed)) {
		throw new Error('Custom JSON must parse to a JSON object.');
	}

	return parsed;
}

export function parseCustomFields(rawValue: unknown): IDataObject | undefined {
	if (rawValue === undefined || rawValue === null || rawValue === '') {
		return undefined;
	}

	if (!isPlainObject(rawValue)) {
		throw new Error('Custom fields must be key/value entries.');
	}

	const rawFields = rawValue.fields;

	if (!Array.isArray(rawFields)) {
		return undefined;
	}

	const fields: IDataObject = {};

	for (const field of rawFields) {
		if (!isPlainObject(field)) {
			continue;
		}

		const key = typeof field.key === 'string' ? field.key.trim() : '';
		const value = pruneEmpty(field.value);

		if (key === '' || value === undefined) {
			continue;
		}

		fields[key] = value as IDataObject[string];
	}

	return Object.keys(fields).length > 0 ? fields : undefined;
}

export function mergeCustomFields(
	keyValueFields: IDataObject | undefined,
	jsonFields: IDataObject | undefined,
): IDataObject | undefined {
	const merged = pruneEmpty({
		...(keyValueFields ?? {}),
		...(jsonFields ?? {}),
	});

	return isPlainObject(merged) ? merged : undefined;
}

export function buildLeadIngestionBody(input: LeadIngestionInput): IDataObject {
	const body = {
		lead: {
			phone: input.phone,
			first_name: input.first_name,
			last_name: input.last_name,
			email: input.email,
			address: input.address,
			city: input.city,
			state: input.state,
			zip: input.zip,
		},
		outreach: {
			mode: input.messageMode,
			message: input.messageMode === 'static' ? input.message : undefined,
			sms_opt_in: input.smsOptIn,
			sms_opt_in_language: input.smsOptInLanguage,
		},
		attribution: {
			source_lead_id: input.sourceLeadId,
			channel: input.channel,
			campaign: input.attributionCampaign,
			url_parameters: input.urlParameters,
			external_cms_id: input.externalCmsId,
		},
		routing: {
			from: input.from,
			agent_id: input.agentId,
		},
		custom_fields: mergeCustomFields(input.customFields, input.custom),
		test: input.test,
	};

	return pruneEmpty(body) as IDataObject;
}
