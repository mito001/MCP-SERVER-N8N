const WebSocket = require('ws');
const http = require('http');
const net = require('net');
const ToolManager = require('./tools');
const N8nWorkflowTool = require('./tools/n8n-workflow');

class MCPServer {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3000,
      host: config.host || 'localhost',
      ...config
    };
    this.wss = null;
    this.server = null;
    this.toolManager = new ToolManager();
    
    // Register tools
    this.toolManager.registerTool('n8n_workflow', new N8nWorkflowTool());
  }

  async findAvailablePort(startPort) {
    const port = startPort || this.config.port;
    
    try {
      await this.testPort(port);
      return port;
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} in use, trying ${port + 1}`);
        return this.findAvailablePort(port + 1);
      }
      throw err;
    }
  }

  testPort(port) {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.unref();
      
      server.on('error', reject);
      
      server.listen(port, () => {
        server.close(() => resolve(port));
      });
    });
  }

  handleConnection(ws) {
    console.log('New client connected');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        await this.handleMessage(ws, data);
      } catch (error) {
        console.error('Error processing message:', error);
        this.sendError(ws, error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  async handleMessage(ws, message) {
    try {
      switch (message.method) {
        case 'initialize':
          this.handleInitialize(ws, message);
          break;
        case 'tool/execute':
          await this.handleToolExecution(ws, message);
          break;
        case 'tool/list':
          this.handleToolList(ws, message);
          break;
        default:
          console.warn(`Unknown message method: ${message.method}`);
          this.sendError(ws, new Error(`Unknown method: ${message.method}`));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(ws, error);
    }
  }

  handleInitialize(ws, message) {
    const response = {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        serverInfo: {
          name: "n8n-mcp-server",
          version: "1.0.0"
        },
        capabilities: {
          tools: this.toolManager.getToolDefinitions()
        }
      }
    };
    
    ws.send(JSON.stringify(response));
  }

  async handleToolExecution(ws, message) {
    try {
      const { tool, params } = message.params;
      const result = await this.toolManager.executeTool(tool, params);
      
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result
      };
      
      ws.send(JSON.stringify(response));
    } catch (error) {
      this.sendError(ws, error, message.id);
    }
  }

  handleToolList(ws, message) {
    const response = {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        tools: this.toolManager.getToolDefinitions()
      }
    };
    
    ws.send(JSON.stringify(response));
  }

  sendError(ws, error, id = null) {
    const errorResponse = {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32000,
        message: error.message || 'Internal server error'
      }
    };
    
    try {
      ws.send(JSON.stringify(errorResponse));
    } catch (err) {
      console.error('Error sending error response:', err);
    }
  }

  async start() {
    try {
      const port = await this.findAvailablePort();
      
      this.server = http.createServer();
      this.wss = new WebSocket.Server({ server: this.server });

      this.wss.on('connection', this.handleConnection.bind(this));
      
      this.server.listen(port, this.config.host, () => {
        console.log(`Server running at http://${this.config.host}:${port}`);
      });

      return port;
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }

  stop() {
    return new Promise((resolve, reject) => {
      if (this.wss) {
        this.wss.close((err) => {
          if (err) {
            console.error('Error closing WebSocket server:', err);
            reject(err);
            return;
          }
          
          if (this.server) {
            this.server.close((err) => {
              if (err) {
                console.error('Error closing HTTP server:', err);
                reject(err);
                return;
              }
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = MCPServer;