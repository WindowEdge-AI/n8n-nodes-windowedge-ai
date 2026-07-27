const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
	buildLeadIngestionBody,
	parseCustomFields,
	parseCustomJson,
	pruneEmpty,
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
