const io = require('socket.io-client');

// Connect to the backend WebSocket with correct transport options
const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  upgrade: false
});

let serverId = null;

socket.on('connect', () => {
  console.log('Connected to backend');
  
  // First connect to a server
  const connectionInfo = {
    id: 'test-server-1',
    name: 'Test Server',
    host: 'localhost', // For testing purposes
    port: 22,
    username: 'test',
    password: 'test'
  };
  
  console.log('Connecting to server:', connectionInfo);
  socket.emit('diagnostics:connect', connectionInfo);
});

socket.on('diagnostics:connection-status', (data) => {
  console.log('Server connection status:', data);
  if (data.success) {
    serverId = data.serverId;
    console.log('Server connected successfully, now performing diagnostics...');
    
    // Perform diagnostics after successful connection
    const diagnosticRequest = {
      serverId: serverId,
      symptoms: 'High CPU usage and slow response times',
      logPaths: ['/var/log/apache2/access.log', '/var/log/apache2/error.log']
    };
    
    console.log('Sending diagnostics request:', diagnosticRequest);
    socket.emit('diagnostics:analyze', diagnosticRequest);
  } else {
    console.log('Failed to connect to server');
    process.exit(1);
  }
});

socket.on('diagnostics:result', (data) => {
  console.log('Received diagnostics result:');
  console.log('Analysis length:', data.analysis.length);
  console.log('Analysis preview:', data.analysis.substring(0, 500) + '...');
  console.log('Recommendations:', data.recommendations);
  process.exit(0);
});

socket.on('diagnostics:error', (data) => {
  console.log('Received diagnostics error:', data);
  process.exit(1);
});

socket.on('connect_error', (error) => {
  console.log('Connection error:', error);
  process.exit(1);
});
