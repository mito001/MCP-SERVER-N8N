const { NodeVM } = require('vm2');
const n8n = require('n8n-core');

class ToolManager {
  constructor() {
    this.tools = new Map();
    this.vm = new NodeVM({
      console: 'inherit',
      sandbox: {},
      require: {
        external: true,
        builtin: ['*'],
      }
    });
  }

  registerTool(name, toolDefinition) {
    this.tools.set(name, toolDefinition);
  }

  async executeTool(name, params) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    try {
      const result = await tool.execute(params, this.vm);
      return result;
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      throw error;
    }
  }

  getToolDefinitions() {
    const definitions = {};
    for (const [name, tool] of this.tools) {
      definitions[name] = tool.getDefinition();
    }
    return definitions;
  }
}

module.exports = ToolManager;