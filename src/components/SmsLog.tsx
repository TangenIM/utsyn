'use client';

import { useCallback, useEffect, useState } from 'react';

interface Notification { id: number; guest_name: string; confirmation_code: string; event: string; status: string; error_code: string | null; created_at: string }
const statuses: Record<string,string> = { pending:'Venter', retrying:'Behandles', sending:'Behandles', queued:'Hos leverandøren', accepted:'Hos leverandøren', sent:'Sendt', delivered:'Levert', read:'Lest', disabled:'Deaktivert', failed:'Feilet', undelivered:'Ikke levert' };
const events: Record<string,string> = { received:'Ny bestilling', confirmed:'Bekreftet', cancelled:'Kansellert', noshow:'Ikke møtt' };

export default function SmsLog() {
    const [rows,setRows] = useState<Notification[]>([]);
    const [busy,setBusy] = useState(false);
    const [error,setError] = useState('');
    const load = useCallback(async (refresh = false) => {
        setBusy(true);
        try {
            const response = await fetch('/api/sms' + (refresh ? '?refresh=true' : ''), { cache:'no-store' });
            if (!response.ok) throw new Error('Kunne ikke laste SMS-loggen');
            setRows(await response.json());
            setError('');
        } catch { setError('Kunne ikke laste SMS-loggen. Prøv igjen.'); }
        finally { setBusy(false); }
    },[]);
    useEffect(() => { void load(); },[load]);
    const retry = async (id: number) => {
        setBusy(true);
        try {
            const response = await fetch('/api/sms', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({id}) });
            const data = await response.json();
            if (!response.ok) { setError(data.error || 'Kunne ikke sende SMS.'); return; }
            await load();
            if (data.sms?.status === 'failed') setError('SMS feilet. Feilkode: ' + data.sms.error_code);
        } catch { setError('Kunne ikke sende SMS. Kontroller leverandørloggen før du prøver igjen.'); }
        finally { setBusy(false); }
    };
    return <section className="admin-form-section" aria-labelledby="sms-log-title">
        <h2 id="sms-log-title">SMS-logg</h2>
        <p>Bestillinger lagres selv om SMS feiler. Hos leverandøren betyr at meldingen er mottatt av leverandøren. Levert bekrefter levering.</p>
        <button className="btn btn-secondary" onClick={() => load(true)} disabled={busy}>{busy ? 'Oppdaterer...' : 'Oppdater leveringsstatus'}</button>
        {error && <p role="alert" className="form-error">{error}</p>}
        <div className="admin-table-container"><table className="admin-table"><thead><tr><th>Gjest / kode</th><th>Hendelse</th><th>Status</th><th>Handling</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id}>
                <td>{row.guest_name || 'Slettet bestilling'}<br/><code>{row.confirmation_code}</code></td>
                <td>{events[row.event] || row.event}<br/><small>{new Date(row.created_at).toLocaleString('nb-NO',{timeZone:'Europe/Oslo'})}</small></td>
                <td>{statuses[row.status] || row.status}{row.error_code && <><br/>Feilkode: {row.error_code}</>}</td>
                <td>{['pending','failed','undelivered','disabled'].includes(row.status) && row.confirmation_code && <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => retry(row.id)}>Prøv igjen</button>}</td>
            </tr>)}</tbody>
        </table></div>
        {!rows.length && <p>Ingen SMS-varslinger ennå.</p>}
    </section>;
}
