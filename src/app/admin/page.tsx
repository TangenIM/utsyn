'use client';

import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const router = useRouter();
    const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [setupToken, setSetupToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check auth first
        fetch('/api/auth/me').then(r => {
            if (r.ok) {
                router.push('/admin/dashboard');
                return;
            }
            // Not logged in, check if setup needed
            return fetch('/api/setup').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
                setNeedsSetup(data.needsSetup);
            });
        }).catch(() => {
            setError('Kunne ikke koble til serveren. Last siden på nytt for å prøve igjen.');
            setNeedsSetup(false);
        });
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (res.ok) {
                router.push('/admin/dashboard');
            } else {
                setError(data.error || 'Feil brukernavn eller passord');
            }
        } catch {
            setError('Noe gikk galt. Prøv igjen.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, display_name: displayName, setup_token: setupToken }),
            });
            const data = await res.json();
            if (res.ok) {
                setNeedsSetup(false);
                setError('');
                setUsername('');
                setPassword('');
                setDisplayName('');
            } else {
                setError(data.error || 'Oppsettet feilet');
            }
        } catch {
            setError('Noe gikk galt. Prøv igjen.');
        } finally {
            setLoading(false);
        }
    };

    if (needsSetup === null) {
        return (
            <div className="login-page">
                <div className="loading"><div className="spinner" /></div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
                    <Image width={300} height={200} src="/utsyn_logo.png" alt="Restaurant Utsyn" style={{ height: '160px', width: 'auto', margin: '0 auto var(--space-md)' }} />
                </div>

                {needsSetup ? (
                    <>
                        <h1>Førstegangsoppsett</h1>
                        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)', fontSize: 'var(--font-size-sm)' }}>
                            Opprett den første admin-kontoen for å komme i gang.
                        </p>
                        <form onSubmit={handleSetup}>
                            {error && <div className="login-error" role="alert">{error}</div>}
                            <div className="form-group">
                                <label htmlFor="setup-token" className="form-label">Oppsettsnøkkel *</label>
                                <input id="setup-token" type="password" className="form-input" value={setupToken} onChange={e => setSetupToken(e.target.value)} required autoComplete="off" />
                                <p>Bruk verdien for SETUP_TOKEN fra serverens miljøvariabler.</p>
                            </div>
                            <div className="form-group">
                                <label htmlFor="setup-name" className="form-label">Visningsnavn</label>
                                <input
                                    id="setup-name"
                                    type="text"
                                    className="form-input"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Administrator"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="setup-username" className="form-label">Brukernavn *</label>
                                <input
                                    id="setup-username"
                                    type="text"
                                    className="form-input"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="admin"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="setup-password" className="form-label">Passord *</label>
                                <input
                                    id="setup-password"
                                    type="password"
                                    className="form-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Minst 12 tegn"
                                    required
                                    minLength={12}
                                    autoComplete="new-password"
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                                {loading ? '...' : 'Opprett admin-konto'}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <h1>Logg inn</h1>
                        <form onSubmit={handleLogin}>
                            {error && <div className="login-error" role="alert">{error}</div>}
                            <div className="form-group">
                                <label htmlFor="login-username" className="form-label">Brukernavn</label>
                                <input
                                    id="login-username"
                                    type="text"
                                    className="form-input"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoComplete="username"
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="login-password" className="form-label">Passord</label>
                                <input
                                    id="login-password"
                                    type="password"
                                    className="form-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                                {loading ? '...' : 'Logg inn'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
