'use client';

import Modal from '@/components/Modal';
import React, { useEffect, useState, useCallback } from 'react';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  created_at: string;
}

export default function BrukerePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Add user form
  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff'>('staff');
  const [formError, setFormError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          display_name: newDisplayName,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setNewUsername('');
        setNewPassword('');
        setNewDisplayName('');
        setNewRole('staff');
        fetchUsers();
        showToast('Bruker opprettet!');
      } else {
        setFormError(data.error || 'Feil ved opprettelse');
      }
    } catch {
      setFormError('Noe gikk galt');
    }
  };

  const confirmDeleteUser = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      message: 'Er du sikker på at du vil slette denne brukeren?',
      onConfirm: () => executeDeleteUser(id)
    });
  };

  const executeDeleteUser = async (id: number) => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
        showToast('Bruker slettet!');
      } else {
        showToast(data.error || 'Feil ved sletting');
      }
    } catch {
      showToast('Noe gikk galt');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Brukere</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Avbryt' : '+ Legg til bruker'}
        </button>
      </div>

      {showForm && (
        <div className="admin-form-section" style={{ marginBottom: 'var(--space-xl)' }}>
          <h3>Ny bruker</h3>
          <form onSubmit={addUser}>
            {formError && <div className="login-error">{formError}</div>}
            <div className="admin-form-grid">
              <div className="form-group">
                <label htmlFor="brukere-field-1" className="form-label">Visningsnavn</label>
                <input id="brukere-field-1"
                  className="form-input"
                  value={newDisplayName}
                  onChange={e => setNewDisplayName(e.target.value)}
                  placeholder="F.eks. Ola Nordmann"
                />
              </div>
              <div className="form-group">
                <label htmlFor="brukere-field-2" className="form-label">Brukernavn *</label>
                <input id="brukere-field-2"
                  className="form-input"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  required
                  minLength={3}
                  placeholder="Minst 3 tegn"
                />
              </div>
              <div className="form-group">
                <label htmlFor="brukere-field-3" className="form-label">Passord *</label>
                <input id="brukere-field-3"
                  className="form-input"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={12}
                  placeholder="Minst 12 tegn"
                />
              </div>
              <div className="form-group">
                <label htmlFor="brukere-field-4" className="form-label">Rolle</label>
                <select id="brukere-field-4" className="form-select" value={newRole} onChange={e => setNewRole(e.target.value as 'admin' | 'staff')}>
                  <option value="staff">Ansatt</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Opprett bruker</button>
          </form>
        </div>
      )}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Visningsnavn</th>
              <th>Brukernavn</th>
              <th>Rolle</th>
              <th>Opprettet</th>
              <th>Handling</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.display_name}</td>
                <td><code style={{ background: 'var(--color-bg-alt)', padding: '2px 6px', borderRadius: '4px' }}>{u.username}</code></td>
                <td>
                  <span className={`status-badge ${u.role === 'admin' ? 'status-confirmed' : 'status-completed'}`}>
                    {u.role === 'admin' ? 'Administrator' : 'Ansatt'}
                  </span>
                </td>
                <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {new Date(u.created_at).toLocaleDateString('nb-NO')}
                </td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => confirmDeleteUser(u.id)}>
                    Slett
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <Modal title="Bekreft handling" onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Bekreft handling</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              >
                Avbryt
              </button>
              <button 
                className="btn btn-danger" 
                onClick={confirmDialog.onConfirm}
              >
                Slett
              </button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx>{`
        
        .modal-content {
          background: var(--color-bg-card);
          padding: var(--space-2xl);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          width: 100%;
        }
      `}</style>
    </>
  );
}
