import postgres from 'postgres';

for (const filename of ['.env.local','.env']) {
    try { process.loadEnvFile(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
let failed = false;
function check(label, valid) {
    console.log(`${valid ? 'OK' : 'FAIL'}: ${label}`);
    if (!valid) failed = true;
}
check('Node.js 24 or 26', [24,26].includes(Number(process.versions.node.split('.')[0])));
check('DATABASE_URL configured', !!process.env.DATABASE_URL);
check('JWT_SECRET has at least 32 characters and replaces the example', (process.env.JWT_SECRET?.length || 0) >= 32 && !process.env.JWT_SECRET.startsWith('replace-with-'));
check('SETUP_TOKEN configured for first administrator', (process.env.SETUP_TOKEN?.length || 0) >= 16 && !process.env.SETUP_TOKEN.startsWith('replace-with-'));
let origin;
try { origin = new URL(process.env.APP_URL); } catch { /* reported below */ }
check('APP_URL is an origin without credentials or a path', !!origin && !origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash);
check('Production APP_URL uses HTTPS', process.env.NODE_ENV !== 'production' || origin?.protocol === 'https:');
const provider = process.env.SMS_PROVIDER || 'disabled';
check('SMS_PROVIDER is disabled, twilio or webhook', ['disabled','twilio','webhook'].includes(provider));
if (provider === 'twilio') {
    check('Twilio account SID configured', /^AC[0-9a-f]{32}$/i.test(process.env.TWILIO_ACCOUNT_SID || ''));
    check('Twilio auth token configured', !!process.env.TWILIO_AUTH_TOKEN);
    check('Twilio sender uses international format', /^\+[1-9]\d{7,14}$/.test(process.env.TWILIO_FROM_NUMBER || ''));
}
if (process.env.DATABASE_URL) {
    const sql = postgres(process.env.DATABASE_URL, { max:1, connect_timeout:10, ssl:process.env.DATABASE_SSL === 'require' ? {rejectUnauthorized:true,ca:process.env.DB_CA_CERT} : undefined });
    try { await sql`SELECT 1`; check('PostgreSQL connection',true); }
    catch { check('PostgreSQL connection (check URL, TLS certificate and firewall)',false); }
    finally { await sql.end({timeout:5}); }
}
console.log('No secrets were printed. No SMS was sent. Database schema is created on the first API request.');
process.exitCode = failed ? 1 : 0;
