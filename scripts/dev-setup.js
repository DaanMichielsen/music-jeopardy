#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');

// Get local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  Object.keys(interfaces).forEach((interfaceName) => {
    const interface = interfaces[interfaceName];
    interface.forEach((details) => {
      if (details.family === 'IPv4' && !details.internal) {
        ips.push({
          name: interfaceName,
          address: details.address
        });
      }
    });
  });
  
  return ips;
}

// Display available IPs
const localIPs = getLocalIPs();
console.log('🌐 Available network addresses:');
localIPs.forEach(ip => {
  console.log(`  ${ip.name}: http://${ip.address}:3000`);
});
console.log('');

// Start socket server
console.log('🔌 Starting WebSocket server...');
const socketServer = spawn('node', ['scripts/start-socket-server.js'], {
  stdio: 'inherit',
  shell: true
});

// Wait a moment for socket server to start
setTimeout(() => {
  console.log('🚀 Starting Next.js development server...');
  console.log('📱 You can access the app from any of the IP addresses above');
  console.log('🔗 Buzzer QR codes will work on any device on your network');
  console.log('');
  
  const nextServer = spawn('pnpm', ['dev'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      // Allow connections from any IP
      HOSTNAME: '0.0.0.0',
      PORT: '3000'
    }
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    socketServer.kill('SIGINT');
    nextServer.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down servers...');
    socketServer.kill('SIGTERM');
    nextServer.kill('SIGTERM');
    process.exit(0);
  });
  
}, 2000); 