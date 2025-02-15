const MCPServer = require('./server');

async function main() {
  const server = new MCPServer({
    port: 3000,
    host: 'localhost'
  });

  try {
    const port = await server.start();
    console.log(`Servidor MCP iniciado en puerto ${port}`);
    console.log('Configuración cargada correctamente');
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }

  process.on('SIGINT', async () => {
    console.log('\nCerrando servidor...');
    await server.stop();
    process.exit(0);
  });
}

main();