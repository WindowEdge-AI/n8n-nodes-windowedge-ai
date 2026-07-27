const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
	businessPhoneSearchResults,
	buildLeadIngestionBody,
	normalizeBaseUrl,
	parseCustomFields,
	parseCustomJson,
	pruneEmpty,
	resourceLocatorValue,
	smsAgentSearchResults,
} = require('../dist/nodes/WindowEdgeAi/GenericFunctions');

test('buildLeadIngestionBody creates the platform lead ingestion contract and prunes empty fields', () => {
	const customFields = parseCustomFields({
		fields: [
			{
				key: 'project_type',
				value: 'windows',
			},
			{
				key: 'empty',
				value: '',
			},
		],
	});

	const body = buildLeadIngestionBody({
		phone: ' +15551234567 ',
		first_name: ' Ava ',
		last_name: '',
		email: 'ava@example.com',
		address: '123 Main St',
		city: 'Denver',
		state: 'CO',
		zip: '80202',
		messageMode: 'static',
		message: ' Please call this homeowner. ',
		smsOptIn: true,
		smsOptInLanguage: 'I agree to receive SMS updates from WindowEdge.',
		sourceLeadId: 'lead-123',
		channel: 'google',
		attributionCampaign: 'spring-windows',
		urlParameters: 'utm_source=google&utm_campaign=spring-windows',
		externalCmsId: 'cms-456',
		from: '+15557654321',
		agentId: '550e8400-e29b-41d4-a716-446655440000',
		customFields,
		custom: parseCustomJson('{"form_id":"quote-form"}'),
		test: false,
	});

	assert.deepEqual(body, {
		lead: {
			phone: '+15551234567',
			first_name: 'Ava',
			email: 'ava@example.com',
			address: '123 Main St',
			city: 'Denver',
			state: 'CO',
			zip: '80202',
		},
		outreach: {
			mode: 'static',
			message: 'Please call this homeowner.',
			sms_opt_in: true,
			sms_opt_in_language: 'I agree to receive SMS updates from WindowEdge.',
		},
		attribution: {
			source_lead_id: 'lead-123',
			channel: 'google',
			campaign: 'spring-windows',
			url_parameters: 'utm_source=google&utm_campaign=spring-windows',
			external_cms_id: 'cms-456',
		},
		routing: {
			from: '+15557654321',
			agent_id: '550e8400-e29b-41d4-a716-446655440000',
		},
		custom_fields: {
			project_type: 'windows',
			form_id: 'quote-form',
		},
		test: false,
	});

	assert.equal('message' in body, false);
	assert.equal('project' in body, false);
	assert.equal('consent' in body, false);
	assert.equal('custom' in body, false);
	assert.equal('test_lead' in body, false);
});

test('ai generated message mode omits empty optional objects', () => {
	const body = buildLeadIngestionBody({
		phone: '+15551234567',
		messageMode: 'ai_generated',
	});

	assert.deepEqual(body, {
		lead: {
			phone: '+15551234567',
		},
		outreach: {
			mode: 'ai_generated',
		},
	});
});

test('explicit false SMS opt-in is preserved in the request body', () => {
	const body = buildLeadIngestionBody({
		phone: '+15551234567',
		messageMode: 'ai_generated',
		smsOptIn: false,
	});

	assert.deepEqual(body, {
		lead: {
			phone: '+15551234567',
		},
		outreach: {
			mode: 'ai_generated',
			sms_opt_in: false,
		},
	});
});

test('parseCustomFields accepts key value rows and ignores blank entries', () => {
	assert.deepEqual(
		parseCustomFields({
			fields: [
				{
					key: 'source_id',
					value: 'abc',
				},
				{
					key: 'blank_value',
					value: '',
				},
				{
					key: '',
					value: 'ignored',
				},
			],
		}),
		{
			source_id: 'abc',
		},
	);
});

test('parseCustomJson accepts JSON objects and rejects arrays', () => {
	assert.deepEqual(parseCustomJson('{"source_id":"abc"}'), {
		source_id: 'abc',
	});
	assert.throws(() => parseCustomJson('[]'), /Custom JSON must parse to a JSON object/);
});

test('pruneEmpty keeps false and zero values', () => {
	assert.deepEqual(pruneEmpty({ active: false, count: 0, empty: '' }), {
		active: false,
		count: 0,
	});
});

test('normalizeBaseUrl trims whitespace and trailing slashes', () => {
	assert.equal(normalizeBaseUrl(' https://api.windowedge.ai/// '), 'https://api.windowedge.ai');
	assert.equal(normalizeBaseUrl(''), 'https://api.windowedge.ai');
});

test('resourceLocatorValue supports resource locators and legacy string values', () => {
	assert.equal(resourceLocatorValue({ mode: 'list', value: ' agent-123 ' }), 'agent-123');
	assert.equal(resourceLocatorValue(' +15557654321 '), '+15557654321');
	assert.equal(resourceLocatorValue({ mode: 'list', value: '' }), undefined);
	assert.equal(resourceLocatorValue({}), undefined);
});

test('businessPhoneSearchResults formats, filters, and deduplicates tenant phones', () => {
	const response = {
		business_phones: [
			{
				id: 'phone-1',
				phone_number: '+15557654321',
				label: 'Main Office',
				is_default: true,
			},
			{
				id: 'phone-2',
				phone_number: '+15559876543',
				label: '',
				is_default: false,
			},
			{
				id: 'duplicate',
				phone_number: '+15557654321',
				label: 'Duplicate',
			},
			{
				id: 'invalid',
			},
		],
	};

	assert.deepEqual(businessPhoneSearchResults(response), [
		{
			name: 'Main Office (+15557654321) - Default',
			value: '+15557654321',
		},
		{
			name: '+15559876543',
			value: '+15559876543',
		},
	]);
	assert.deepEqual(businessPhoneSearchResults(response, 'main'), [
		{
			name: 'Main Office (+15557654321) - Default',
			value: '+15557654321',
		},
	]);
	assert.deepEqual(businessPhoneSearchResults({}), []);
});

test('smsAgentSearchResults formats, filters, and deduplicates tenant agents', () => {
	const response = {
		sms_agents: [
			{
				id: 'agent-1',
				label: 'Sales Agent',
			},
			{
				id: 'agent-2',
				label: '',
			},
			{
				id: 'agent-1',
				label: 'Duplicate',
			},
			{
				label: 'Invalid',
			},
		],
	};

	assert.deepEqual(smsAgentSearchResults(response), [
		{
			name: 'Sales Agent',
			value: 'agent-1',
		},
		{
			name: 'agent-2',
			value: 'agent-2',
		},
	]);
	assert.deepEqual(smsAgentSearchResults(response, 'sales'), [
		{
			name: 'Sales Agent',
			value: 'agent-1',
		},
	]);
	assert.deepEqual(smsAgentSearchResults(null), []);
});
