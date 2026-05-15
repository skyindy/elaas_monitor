const http = require('http');

const data = JSON.stringify({
    sql: "SELECT 1 as num;",
    ipOverrides: null
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/execute',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', d => {
        responseData += d;
    });
    
    res.on('end', () => {
        console.log('Response:', responseData);
    });
});

req.on('error', error => {
    console.error('Error fetching from API:', error);
});

req.write(data);
req.end();
