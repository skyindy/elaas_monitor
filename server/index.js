const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Pool, Client } = require('pg');
const ExcelJS = require('exceljs');

const app = express();
const PORT = 5000;
const CONFIG_PATH = path.join(__dirname, 'config.json');

app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Load config
const loadConfig = () => {
    if (!fs.existsSync(CONFIG_PATH)) {
        const initialConfig = {
            connections: Array.from({ length: 8 }, (_, i) => ({
                id: i + 1,
                name: `Database ${i + 1}`,
                host: '',
                port: 5432,
                user: '',
                password: '',
                database: '',
                enabled: true,
                ssl: false,
                sslCa: '',
                sslCert: '',
                sslKey: '',
                useConnectionString: false,
                connectionString: ''
            })),
            categories: [],
            queries: [],
            reports: [],
            page3Reports: []
        };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(initialConfig, null, 2));
        return initialConfig;
    }
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    // Ensure default arrays exist to prevent data loss on older configs
    if (!config.connections) config.connections = [];
    if (!config.categories) config.categories = [];
    if (!config.fixIpCategories) config.fixIpCategories = [];
    if (!config.queries) config.queries = [];
    if (!config.fixIpReports) config.fixIpReports = [];
    if (!config.reports) config.reports = [];
    return config;
};

const saveConfig = (config) => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
};

// Routes
app.get('/api/config', (req, res) => {
    res.json(loadConfig());
});

app.post('/api/connections', (req, res) => {
    const config = loadConfig();
    config.connections = req.body;
    saveConfig(config);
    res.json({ message: 'Connections updated successfully' });
});

app.post('/api/queries', (req, res) => {
    const config = loadConfig();
    config.queries = req.body;
    saveConfig(config);
    res.json({ message: 'Queries updated successfully' });
});

app.post('/api/categories', (req, res) => {
    const config = loadConfig();
    config.categories = req.body;
    saveConfig(config);
    res.json({ message: 'Categories updated successfully' });
});

app.post('/api/fixipcategories', (req, res) => {
    const config = loadConfig();
    config.fixIpCategories = req.body;
    saveConfig(config);
    res.json({ message: 'Fix Ip Categories updated successfully' });
});

app.post('/api/fixipreports', (req, res) => {
    const config = loadConfig();
    config.fixIpReports = req.body;
    saveConfig(config);
    res.json({ message: 'Fix Ip reports updated successfully' });
});

app.post('/api/reports', (req, res) => {
    const config = loadConfig();
    config.reports = req.body;
    saveConfig(config);
    res.json({ message: 'Reports updated successfully' });
});

app.post('/api/checksite', (req, res) => {
    const config = loadConfig();
    config.checkSiteReports = req.body;
    saveConfig(config);
    res.json({ message: 'CheckSite reports updated successfully' });
});

app.post('/api/test-connection', async (req, res) => {
    const conn = req.body;
    console.log(`\n--- Connection Test Start ---`);
    console.log(`Target: ${conn.host || 'URI Mode'}:${conn.port || ''}`);
    
    let sslConfig = false;
    if (conn.ssl) {
        // By default, don't reject unauthorized (allow self-signed/unknown CAs)
        sslConfig = { rejectUnauthorized: false };
        try {
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
        } catch (e) {
            console.error(`[SSL Error] ${e.message}`);
            // If cert loading fails, we still try with basic SSL if possible
        }
    }

    const poolConfig = conn.useConnectionString 
        ? { connectionString: conn.connectionString, connectionTimeoutMillis: 10000 }
        : {
            host: conn.host,
            port: conn.port,
            user: conn.user,
            password: conn.password,
            database: conn.database,
            connectionTimeoutMillis: 10000,
            ssl: sslConfig
        };
    
    const client = new Client(poolConfig);
    
    try {
        await client.connect();
        await client.query('SELECT 1');
        console.log(`[Success] Connected to ${conn.host || 'URI'}`);
        res.json({ success: true, message: 'Connection successful!' });
    } catch (err) {
        console.error(`[Connection Error] Code: ${err.code || 'N/A'}`);
        console.error(`Message: ${err.message}`);
        console.error(`Detail: ${err.detail || 'None'}`);
        
        let customMsg = err.message;
        if (err.code === '28P01') customMsg = 'Invalid Password (28P01)';
        if (err.code === '28000') customMsg = 'Invalid User/Role (28000)';
        if (err.code === '3D000') customMsg = 'Database does not exist (3D000)';
        if (err.code === 'ECONNREFUSED') customMsg = 'Connection Refused: Check IP and Port (5432?)';
        if (err.code === 'ETIMEDOUT') customMsg = 'Connection Timed Out: Check Firewall/VPN';
        
        res.status(500).json({ 
            success: false, 
            message: customMsg, 
            detail: err.detail,
            code: err.code 
        });
    } finally {
        await client.end().catch(() => {});
        console.log(`--- Connection Test End ---\n`);
    }
});

// Execute query against all enabled databases with optional IP override
const executeQuery = async (connections, sql, ipOverride = null) => {
    const results = [];
    
    // Determine which targets to query
    let targets = [];
    if (ipOverride) {
        // Mode: Single IP override
        // Use credentials from the first enabled connection slot
        const base = connections.find(c => c.enabled) || connections[0];
        targets = [{ ...base, host: ipOverride, name: `Override (${ipOverride})` }];
    } else {
        // Mode: Standard 8-DB list
        targets = connections.filter(c => c.enabled);
        // Also handle those that are enabled but have no host (will be skipped later)
        connections.forEach(c => {
            if (!c.enabled) results.push({ id: c.id, name: c.name, status: 'SKIPPED', data: [] });
        });
    }

    for (const conn of targets) {
        if (!conn.host) {
            results.push({ id: conn.id, name: conn.name, status: 'SKIPPED (No IP)', data: [] });
            continue;
        }

        console.log(`[Execute] Querying ${conn.name} (${conn.host})...`);
        let sslConfig = false;
        if (conn.ssl) {
            sslConfig = { rejectUnauthorized: false };
            try {
                if (conn.sslCa && fs.existsSync(conn.sslCa)) {
                    sslConfig.ca = fs.readFileSync(conn.sslCa).toString();
                }
                if (conn.sslCert && fs.existsSync(conn.sslCert)) {
                    sslConfig.cert = fs.readFileSync(conn.sslCert).toString();
                }
                if (conn.sslKey && fs.existsSync(conn.sslKey)) {
                    sslConfig.key = fs.readFileSync(conn.sslKey).toString();
                }
            } catch (e) {
                console.error(`[SSL Error] ${conn.name}: ${e.message}`);
            }
        }

        const poolConfig = conn.useConnectionString 
            ? { connectionString: conn.connectionString, connectionTimeoutMillis: 10000 }
            : {
                host: conn.host,
                port: conn.port,
                user: conn.user,
                password: conn.password,
                database: conn.database,
                connectionTimeoutMillis: 10000,
                ssl: sslConfig
            };

        const pool = new Pool(poolConfig);
        try {
            const res = await pool.query(sql);
            console.log(`[Execute] Success: ${conn.name}`);
            results.push({ 
                id: conn.id, 
                name: conn.name, 
                status: 'SUCCESS', 
                data: res.rows,
                columns: res.fields.map(f => f.name)
            });
        } catch (err) {
            console.error(`[Execute] Error on ${conn.name}: ${err.message}`);
            results.push({ id: conn.id, name: conn.name, status: 'ERROR', message: err.message, data: [] });
        } finally {
            await pool.end();
        }
    }
    return results;
};

app.post('/api/execute', async (req, res) => {
    const { sql, ipOverrides } = req.body;
    const config = loadConfig();
    
    let isAborted = false;
    req.on('close', () => {
        isAborted = true;
    });

    try {
        let targets;
        if (ipOverrides) {
            const matched = config.connections.find(c => c.host === ipOverrides) || config.connections[0];
            targets = [{ ...matched, host: ipOverrides, name: matched.name || `Override (${ipOverrides})` }];
        } else {
            targets = config.connections;
        }
        
        const promises = targets.map(async (conn) => {
            if (isAborted) return null;
            if (!conn.enabled && !ipOverrides) {
                return { id: conn.id, name: conn.name, status: 'SKIPPED' };
            }
            
            console.log(`[${conn.name}] Starting connection attempt...`);
            let client;
            try {
                let sslConfig = false;
                if (conn.ssl) {
                    sslConfig = { rejectUnauthorized: false };
                    if (conn.sslCa && fs.existsSync(conn.sslCa)) {
                        sslConfig.ca = fs.readFileSync(conn.sslCa).toString();
                    }
                    if (conn.sslCert && fs.existsSync(conn.sslCert)) {
                        sslConfig.cert = fs.readFileSync(conn.sslCert).toString();
                    }
                    if (conn.sslKey && fs.existsSync(conn.sslKey)) {
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
                    connectionTimeoutMillis: 10000,
                    query_timeout: 60000 // Add query timeout to prevent hanging (60 seconds)
                };

                client = new Client(clientConfig);
                
                console.log(`[${conn.name}] Awaiting connect...`);
                await client.connect();
                console.log(`[${conn.name}] Connected. Awaiting query...`);
                const dbRes = await client.query(sql);
                let finalData = [];
                let finalColumns = [];
                
                if (Array.isArray(dbRes)) {
                    // Find the last result that has rows, or just use the last one
                    const lastResult = dbRes.slice().reverse().find(r => r.fields && r.fields.length > 0) || dbRes[dbRes.length - 1];
                    finalData = lastResult.rows || [];
                    finalColumns = lastResult.fields ? lastResult.fields.map(f => f.name) : [];
                } else {
                    finalData = dbRes.rows || [];
                    finalColumns = dbRes.fields ? dbRes.fields.map(f => f.name) : [];
                }

                console.log(`[${conn.name}] Query finished. Returning SUCCESS with ${finalData.length} rows.`);
                console.log(`[${conn.name}] Data Sample:`, JSON.stringify(finalData).substring(0, 500)); // Log the data to terminal for debugging
                return { 
                    id: conn.id, 
                    name: conn.name, 
                    status: 'SUCCESS', 
                    data: finalData, 
                    columns: finalColumns 
                };
            } catch (err) {
                console.log(`[${conn.name}] Error caught: ${err.message}`);
                return { id: conn.id, name: conn.name, status: 'ERROR', message: err.message };
            } finally {
                if (client) {
                    console.log(`[${conn.name}] Ending client...`);
                    await client.end().catch(e => console.log(`[${conn.name}] End error: ${e.message}`));
                    console.log(`[${conn.name}] Client ended.`);
                }
            }
        });

        
        const rawResults = await Promise.all(promises);
        const results = rawResults.filter(r => r !== null);
        
        console.log(`[Execute] All promises resolved. Sending ${results.length} results to frontend.`);
        res.json(results);
        console.log(`[Execute] Response sent successfully.`);
    } catch (err) {
        console.log(`[Execute] Global Error:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/export', async (req, res) => {
    try {
        const { results, title, isAllDb } = req.body;

        if (!results || !Array.isArray(results)) {
            return res.status(400).json({ error: 'No data provided for export' });
        }

        const workbook = new ExcelJS.Workbook();
        
        for (const result of results) {
            // Sanitize sheet name: max 31 chars, no special chars \ / ? * [ ] :
            let safeName = (result.name || 'Sheet').replace(/[\\\/\?\*\[\]\:]/g, '').substring(0, 31);
            if (!safeName) safeName = `Sheet-${result.id || Math.random()}`;

            if (result.status === 'SUCCESS' || (result.data && result.data.length > 0)) {
                const sheet = workbook.addWorksheet(safeName);
                
                // Highlight yellow if it's an "All DB" report or if this specific DB has data
                if (isAllDb || (result.data && result.data.length > 0)) {
                    sheet.properties.tabColor = { argb: 'FFFFFF00' };
                }
                
                // Determine columns: try columns metadata first, then data keys
                let columnKeys = result.columns || [];
                if (columnKeys.length === 0 && result.data && result.data.length > 0) {
                    columnKeys = Object.keys(result.data[0]);
                }

                if (columnKeys.length > 0) {
                    sheet.columns = columnKeys.map(key => ({ header: key, key: key }));
                    if (result.data && result.data.length > 0) {
                        const safeRows = result.data.map(row => {
                            const newRow = {};
                            for (let k in row) {
                                if (row[k] instanceof Date) {
                                    newRow[k] = row[k];
                                } else if (typeof row[k] === 'object' && row[k] !== null) {
                                    newRow[k] = JSON.stringify(row[k]);
                                } else {
                                    newRow[k] = row[k];
                                }
                            }
                            return newRow;
                        });
                        sheet.addRows(safeRows);
                    } else {
                        sheet.addRow(['(No rows returned)']);
                    }
                } else {
                    sheet.addRow(['Query successful but no columns found.']);
                }
            } else if (result.status === 'ERROR') {
                const sheet = workbook.addWorksheet(`${safeName.substring(0, 23)} (ERR)`);
                sheet.addRow(['Error Message:', result.message || 'Unknown error']);
            }
        }

        if (workbook.worksheets.length === 0) {
            const sheet = workbook.addWorksheet('No Data');
            sheet.addRow(['The query returned no results or all databases failed.']);
        }

        // Sanitize filename and add timestamp suffix
        const timestamp = Date.now();
        const safeFilename = `${(title || 'export').replace(/[\\\/\?\*\[\]\:]/g, '_')}_${timestamp}`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(safeFilename)}.xlsx`);

        const buffer = await workbook.xlsx.writeBuffer();
        res.send(buffer);
    } catch (err) {
        console.error('[Export Error]', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate Excel file: ' + err.message });
        }
    }
});

app.post('/api/export-batch', async (req, res) => {
    try {
        const { batchData, filename } = req.body; // batchData: [{ title, results }]

        if (!batchData || !Array.isArray(batchData)) {
            return res.status(400).json({ error: 'No batch data provided' });
        }

        const workbook = new ExcelJS.Workbook();

        for (const topic of batchData) {
            const { title, results } = topic;
            for (const result of results) {
                if (result.status === 'SUCCESS' && result.data && result.data.length > 0) {
                    // Sheet name: [Topic] DB
                    let topicPart = (title || 'T').substring(0, 15);
                    let dbPart = (result.name || 'DB').substring(0, 10);
                    let safeName = `${topicPart} - ${dbPart}`.replace(/[\\\/\?\*\[\]\:]/g, '').substring(0, 31);
                    
                    const sheet = workbook.addWorksheet(safeName);
                    sheet.properties.tabColor = { argb: 'FFFFFF00' };

                    let columnKeys = result.columns || [];
                    if (columnKeys.length === 0 && result.data.length > 0) {
                        columnKeys = Object.keys(result.data[0]);
                    }

                    if (columnKeys.length > 0) {
                        sheet.columns = columnKeys.map(key => ({ header: key, key: key }));
                        const safeRows = result.data.map(row => {
                            const newRow = {};
                            for (let k in row) {
                                if (typeof row[k] === 'object' && row[k] !== null && !(row[k] instanceof Date)) {
                                    newRow[k] = JSON.stringify(row[k]);
                                } else {
                                    newRow[k] = row[k];
                                }
                            }
                            return newRow;
                        });
                        sheet.addRows(safeRows);
                    }
                }
            }
        }

        if (workbook.worksheets.length === 0) {
            const sheet = workbook.addWorksheet('No Data');
            sheet.addRow(['No results found in selected topics.']);
        }

        const timestamp = Date.now();
        const safeFilename = `${(filename || 'batch_export').replace(/[\\\/\?\*\[\]\:]/g, '_')}_${timestamp}`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(safeFilename)}.xlsx`);

        const buffer = await workbook.xlsx.writeBuffer();
        res.send(buffer);
    } catch (err) {
        console.error('[Export Batch Error]', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
