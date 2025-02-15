const { Workflow } = require('n8n-workflow');

class N8nWorkflowTool {
  constructor() {
    this.name = 'n8n_workflow';
  }

  getDefinition() {
    return {
      name: this.name,
      description: 'Execute n8n workflows',
      parameters: {
        type: 'object',
        properties: {
          workflowData: {
            type: 'object',
            description: 'The workflow data to execute'
          },
          inputData: {
            type: 'object',
            description: 'Input data for the workflow'
          }
        },
        required: ['workflowData']
      }
    };
  }

  async execute(params, vm) {
    const { workflowData, inputData = {} } = params;

    try {
      // Create workflow instance
      const workflow = new Workflow({
        id: 'temp',
        nodes: workflowData.nodes,
        connections: workflowData.connections,
        active: true,
        nodeTypes: {},
      });

      // Execute workflow
      const executionData = await workflow.execute(inputData);
      
      return {
        success: true,
        data: executionData
      };
    } catch (error) {
      console.error('Error executing workflow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = N8nWorkflowTool;