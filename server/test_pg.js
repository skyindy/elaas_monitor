const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const conn = config.connections[0]; // Test the first one

console.log(`Testing connection to ${conn.name} (${conn.host})...`);

let sslConfig = false;
if (conn.ssl) {
    sslConfig = { rejectUnauthorized: false };
    if (conn.sslCa && fs.existsSync(conn.sslCa)) {
        console.log(`Loading CA: ${conn.sslCa}`);
        sslConfig.ca = fs.readFileSync(conn.sslCa).toString();
    }
    if (conn.sslCert && fs.existsSync(conn.sslCert)) {
        console.log(`Loading Cert: ${conn.sslCert}`);
        sslConfig.cert = fs.readFileSync(conn.sslCert).toString();
    }
    if (conn.sslKey && fs.existsSync(conn.sslKey)) {
        console.log(`Loading Key: ${conn.sslKey}`);
        sslConfig.key = fs.readFileSync(conn.sslKey).toString();
    }
}

const clientConfig = {
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    database: conn.database,
    ssl: sslConfig,
    connectionTimeoutMillis: 10000
};

const client = new Client(clientConfig);

client.connect()
    .then(async () => {
        console.log('Successfully connected!');
        const res = await client.query('SELECT 1');
        console.log('Query successful:', res.rows);
        await client.end();
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection failed!');
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);
        console.error('Error Code:', err.code);
        process.exit(1);
    });
