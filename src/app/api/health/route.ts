import getDb from '@/lib/db';

export async function GET() {
    try {
        const sql = await getDb();
        await sql`SELECT 1`;
        return Response.json({status:'ok'}, {headers:{'Cache-Control':'no-store'}});
    } catch {
        return Response.json({status:'unavailable'}, {status:503,headers:{'Cache-Control':'no-store'}});
    }
}
