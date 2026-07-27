const assert = require('node:assert/strict');
const { test } = require('node:test');

const { WindowEdgeAi } = require('../dist/nodes/WindowEdgeAi/WindowEdgeAi.node');

function getAdvancedOption(node, name) {
	const advanced = node.description.properties.find((property) => property.name === 'advanced');
	assert.ok(advanced);
	return advanced.options.find((option) => option.name === name);
}

test('SMS opt-in defaults to false in the node description', () => {
	const node = new WindowEdgeAi();
	const sms = node.description.properties.find((property) => property.name === 'sms');
	assert.ok(sms);

	const smsOptIn = sms.options.find((option) => option.name === 'smsOptIn');
	assert.ok(smsOptIn);
	assert.equal(smsOptIn.default, false);
});

test('tenant routing fields provide list search and manual-entry modes', () => {
	const node = new WindowEdgeAi();
	const businessPhone = getAdvancedOption(node, 'from');
	const smsAgent = getAdvancedOption(node, 'agentId');

	assert.equal(businessPhone.type, 'resourceLocator');
	assert.deepEqual(
		businessPhone.modes.map((mode) => mode.name),
		['list', 'phoneNumber'],
	);
	assert.equal(businessPhone.modes[0].typeOptions.searchListMethod, 'searchBusinessPhones');

	assert.equal(smsAgent.type, 'resourceLocator');
	assert.deepEqual(
		smsAgent.modes.map((mode) => mode.name),
		['list', 'id'],
	);
	assert.equal(smsAgent.modes[0].typeOptions.searchListMethod, 'searchSmsAgents');
});

test('business phone list search calls the tenant options endpoint with authentication', async () => {
	const node = new WindowEdgeAi();
	let capturedRequest;

	const context = {
		async getCredentials(name) {
			assert.equal(name, 'windowEdgeAiApi');
			return {
				baseUrl: 'https://api.windowedge.ai/',
			};
		},
		getNode() {
			return {
				id: 'windowedge-test-node',
				name: 'WindowEdge AI',
				type: '@windowedge/n8n-nodes-windowedge-ai.windowEdgeAi',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};
		},
		helpers: {
			async httpRequestWithAuthentication(credentialName, options) {
				capturedRequest = {
					credentialName,
					options,
				};
				return {
					business_phones: [
						{
							id: 'phone-1',
							phone_number: '+15557654321',
							label: 'Main Office',
							is_default: true,
						},
					],
					sms_agents: [],
				};
			},
		},
	};

	const result = await node.methods.listSearch.searchBusinessPhones.call(context, 'main');

	assert.deepEqual(capturedRequest, {
		credentialName: 'windowEdgeAiApi',
		options: {
			method: 'GET',
			url: 'https://api.windowedge.ai/api/v1/lead-ingestion/options',
			headers: {
				Accept: 'application/json',
			},
			json: true,
		},
	});
	assert.deepEqual(result, {
		results: [
			{
				name: 'Main Office (+15557654321) - Default',
				value: '+15557654321',
			},
		],
	});
});
