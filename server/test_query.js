const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Test DB 1
const conn = config.connections[0];

// The query "เงินรับฝากไม่สมบูรณ์" or similar
const sql = `select distinct lsm.db_name, ls.site_code ,st.sitetype_name , ls.site_name , lp.province_name , la.amphur_name,d.site_id
	, d.sys_id dika_id , d.dika_no  ,d.dika_code , d.reference_doc_type  , d.cheque_flag  , d.allow_cheque_flag
	,dc.created_date dc_created_date , dc.status_flag dc_status_flag ,
	d.created_date d_created_date  , d.status_flag d_status_flag,d.status_cancel_flag,  d.updated_date  , d.updated_user_id  ,
	ec.created_Date ec_created_date , ec.status_flag ec_status_flag  ,ec.payment_receive_system_date,
        'update expense.laas_Exp_Dika  set ' ||
        'status_flag = ' ||   QUOTE_LITERAL('Q')  || ', ' ||
       'cheque_flag = ' || QUOTE_LITERAL('1')  || ', ' ||
       'updated_user_id = ' ||  QUOTE_LITERAL('SYSTEM')  || ', ' || 
       'updated_date =  CLOCK_TIMESTAMP() ' ||
       'where  sys_id = ' || QUOTE_LITERAL( d.sys_id  )  || ' ' ||
       'and dika_no =' || QUOTE_LITERAL( d.dika_no)  || ' ' ||
       'and site_id = ' || QUOTE_LITERAL( d.site_id)  || ' ' ||
       'and status_flag =' || QUOTE_LITERAL( d.status_flag)  || ' ' ||
       'and cheque_flag = ' || QUOTE_LITERAL( d.cheque_flag)  ||  ';' AS sql_query
	from expense.laas_Exp_dika_cheque dc
	join expense.laas_exp_Cheque ec on dc.cheque_id  = ec.sys_id
	join expense.laas_exp_dika d on dc.dika_id  = d.sys_id and dc.site_id  = d.site_id
        join common.laas_site_mapping lsm  on lsm.site_id = d.site_id
	join  aim.laas_site ls on dc.site_id  = ls.sys_id
        join aim.laas_site_type st on	st.sys_id = ls.site_type_id
	join common.laas_province lp on ls.province_id = lp.sys_id
	join common.laas_amphur la on la.sys_id = ls.amphur_id
	where d.budget_year  = 2568
	and ec.status_flag  not in ('X' , 'C' , 'Z')
	and ec.payment_receive_system_date  is not null
	and dc.created_date::date >= '2025-03-01'::date
	and d.status_flag = 'P' and d.cheque_flag = '0'
	;`;

let sslConfig = false;
if (conn.ssl) {
    sslConfig = { rejectUnauthorized: false };
    if (conn.sslCa) sslConfig.ca = fs.readFileSync(conn.sslCa).toString();
    if (conn.sslCert) sslConfig.cert = fs.readFileSync(conn.sslCert).toString();
    if (conn.sslKey) sslConfig.key = fs.readFileSync(conn.sslKey).toString();
}

const client = new Client({
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    database: conn.database,
    ssl: sslConfig
});

async function run() {
    console.log('Connecting...');
    const start = Date.now();
    await client.connect();
    console.log(`Connected in ${Date.now() - start}ms`);
    
    console.log('Executing query...');
    const qStart = Date.now();
    try {
        const res = await client.query(sql);
        console.log(`Query finished in ${Date.now() - qStart}ms`);
        console.log(`Row count: ${res.rowCount}`);
        if (res.rowCount > 0) {
            console.log('First row:', res.rows[0]);
        }
    } catch (e) {
        console.error('Query error:', e);
    } finally {
        await client.end();
    }
}

run();
