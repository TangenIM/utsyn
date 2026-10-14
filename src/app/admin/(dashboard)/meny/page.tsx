'use client';

import { restaurantDate } from '@/lib/utils';

import Modal from '@/components/Modal';
import React, { useEffect, useState, useCallback } from 'react';
import { IconCheck, IconCalendar } from '@/components/Icons';
import { useUser } from '../layout';

interface MenuItem {
    id: number;
    category_id: number;
    name_no: string;
    name_en: string;
    desc_no: string;
    desc_en: string;
    price: number;
    is_active: boolean;
}

interface MenuCategory {
    id: number;
    name_no: string;
    name_en: string;
    sort_order: number;
    items: MenuItem[];
}

export default function MenyPage() {
    const user = useUser();
    const isAdmin = user?.role === 'admin';
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState('');

    const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
    const [addingCategory, setAddingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState({ name_no: '', name_en: '', sort_order: 0 });
    const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({
        isOpen: false,
        message: '',
        onConfirm: () => {}
    });

    // Daily menu state
    const [dailyTab, setDailyTab] = useState(false);
    const [dailyDate, setDailyDate] = useState(restaurantDate);
    const [dailySelectedIds, setDailySelectedIds] = useState<Set<number>>(new Set());
    const [dailyIsDaySpecific, setDailyIsDaySpecific] = useState(false);
    const [dailyLoading, setDailyLoading] = useState(false);

    const fetchMenu = useCallback(async () => {
        try {
            const res = await fetch('/api/menu');
            const data = await res.json();
            if (Array.isArray(data)) {
                setCategories(data);
            }
        } catch (err) {
            console.error('Error fetching menu:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMenu();
    }, [fetchMenu]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        try {
            const url = editingItem.id ? `/api/menu/${editingItem.id}` : '/api/menu';
            const method = editingItem.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingItem)
            });

            if (res.ok) {
                showToast(editingItem.id ? 'Rett oppdatert' : 'Rett lagt til');
                setEditingItem(null);
                fetchMenu();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const confirmDeleteItem = (id: number) => {
        setConfirmDialog({
            isOpen: true,
            message: 'Er du sikker på at du vil slette denne retten?',
            onConfirm: () => executeDeleteItem(id)
        });
    };

    const executeDeleteItem = async (id: number) => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
            const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Rett slettet');
                fetchMenu();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/menu/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCategory)
            });

            if (res.ok) {
                showToast('Kategori lagt til');
                setAddingCategory(false);
                setNewCategory({ name_no: '', name_en: '', sort_order: 0 });
                fetchMenu();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const confirmDeleteCategory = (id: number) => {
        setConfirmDialog({
            isOpen: true,
            message: 'Er du sikker på at du vil slette denne kategorien og alle dens retter?',
            onConfirm: () => executeDeleteCategory(id)
        });
    };

    const executeDeleteCategory = async (id: number) => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
            const res = await fetch(`/api/menu/categories/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Kategori slettet');
                fetchMenu();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Daily menu handlers
    const fetchDailyMenu = useCallback(async (date: string) => {
        setDailyLoading(true);
        try {
            const res = await fetch(`/api/menu/daily?date=${date}`);
            const data = await res.json();
            if (data && data.isDaySpecific) {
                setDailyIsDaySpecific(true);
                const ids = new Set<number>();
                for (const cat of data.categories) {
                    for (const item of cat.items) {
                        ids.add(Number(item.id));
                    }
                }
                setDailySelectedIds(ids);
            } else {
                setDailyIsDaySpecific(false);
                setDailySelectedIds(new Set());
            }
        } catch (err) {
            console.error('Error fetching daily menu:', err);
        } finally {
            setDailyLoading(false);
        }
    }, []);

    useEffect(() => {
        if (dailyTab) {
            fetchDailyMenu(dailyDate);
        }
    }, [dailyTab, dailyDate, fetchDailyMenu]);

    const toggleDailyItem = (itemId: number) => {
        setDailySelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    const saveDailyMenu = async () => {
        try {
            const res = await fetch('/api/menu/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dailyDate, item_ids: Array.from(dailySelectedIds) })
            });
            if (res.ok) {
                showToast('Dagsmeny lagret!');
                setDailyIsDaySpecific(dailySelectedIds.size > 0);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const resetDailyMenu = async () => {
        try {
            const res = await fetch(`/api/menu/daily?date=${dailyDate}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Dagsmeny tilbakestilt til standard');
                setDailyIsDaySpecific(false);
                setDailySelectedIds(new Set());
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Get all active items for daily selection
    const allActiveItems: MenuItem[] = categories.flatMap(c => c.items.filter(i => i.is_active));

    const selectAllItems = () => {
        setDailySelectedIds(new Set(allActiveItems.map(item => item.id)));
    };

    const deselectAllItems = () => {
        setDailySelectedIds(new Set());
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <>
            <div className="admin-header">
                <h1 className="admin-title">Meny</h1>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button
                        className={`btn ${!dailyTab ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setDailyTab(false)}
                    >
                        Alle retter
                    </button>
                    <button
                        className={`btn ${dailyTab ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setDailyTab(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <IconCalendar size={16} /> Dagsmeny
                    </button>
                    {!dailyTab && isAdmin && <button className="btn btn-secondary" onClick={() => setAddingCategory(true)}>+ Ny Kategori</button>}
                </div>
            </div>

            {/* Daily menu management tab */}
            {dailyTab && (
                <div className="admin-form-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                        <div>
                            <h3 style={{ marginBottom: 'var(--space-xs)' }}>Dagsmeny</h3>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                Velg hvilke retter som skal vises p&aring; en bestemt dato. Hvis ingen retter er valgt, vises alle aktive retter.
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <label htmlFor="meny-field-1" className="form-label" style={{ marginBottom: 0 }}>Dato:</label>
                            <input id="meny-field-1"
                                type="date"
                                className="form-input"
                                value={dailyDate}
                                onChange={e => setDailyDate(e.target.value)}
                                style={{ width: 'auto', padding: 'var(--space-xs) var(--space-sm)', minHeight: 'auto' }}
                            />
                        </div>
                    </div>

                    {dailyIsDaySpecific && (
                        <div className="status-badge status-confirmed" style={{ marginBottom: 'var(--space-md)', padding: '6px 12px' }}>
                            <IconCheck size={14} /> Tilpasset dagsmeny
                        </div>
                    )}
                    {!dailyIsDaySpecific && (
                        <div className="status-badge" style={{ marginBottom: 'var(--space-md)', padding: '6px 12px', background: 'var(--color-bg-alt)', color: 'var(--color-text-secondary)' }}>
                            Bruker standardmeny
                        </div>
                    )}

                    {dailyLoading ? (
                        <div className="loading" style={{ padding: 'var(--space-xl)' }}><div className="spinner" /></div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                                <button className="btn btn-ghost btn-sm" onClick={selectAllItems}>Velg alle</button>
                                <button className="btn btn-ghost btn-sm" onClick={deselectAllItems}>Fjern alle</button>
                            </div>

                            {categories.map(cat => {
                                const activeItems = cat.items.filter(i => i.is_active);
                                if (activeItems.length === 0) return null;
                                return (
                                    <div key={cat.id} style={{ marginBottom: 'var(--space-lg)' }}>
                                        <h4 style={{ fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)', letterSpacing: '0.05em' }}>
                                            {cat.name_no} <span style={{ fontWeight: 400 }}>({cat.name_en})</span>
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-sm)' }}>
                                            {activeItems.map(item => {
                                                const isSelected = dailySelectedIds.has(item.id);
                                                return (
                                                    <label
                                                        key={item.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 'var(--space-sm)',
                                                            padding: 'var(--space-sm) var(--space-md)',
                                                            borderRadius: 'var(--radius-md)',
                                                            border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border-light)'}`,
                                                            background: isSelected ? 'var(--color-primary-50)' : 'var(--color-bg-card)',
                                                            cursor: 'pointer',
                                                            transition: 'all var(--transition-fast)'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleDailyItem(item.id)}
                                                            style={{ width: 18, height: 18, flexShrink: 0 }}
                                                        />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: 500 }}>{item.name_no}</div>
                                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{item.name_en}</div>
                                                        </div>
                                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                                                            {item.price} kr
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-xl)', flexWrap: 'wrap' }}>
                                <button className="btn btn-primary" onClick={saveDailyMenu} disabled={dailySelectedIds.size === 0}>
                                    Lagre dagsmeny ({dailySelectedIds.size} retter)
                                </button>
                                {dailyIsDaySpecific && (
                                    <button className="btn btn-ghost" onClick={resetDailyMenu}>
                                        Tilbakestill til standard
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Standard menu items list (original tab) */}
            {!dailyTab && addingCategory && (
                <div className="admin-form-section">
                    <h3>Ny Kategori</h3>
                    <form onSubmit={handleSaveCategory} className="admin-form-grid">
                        <div className="form-group">
                            <label htmlFor="meny-field-2" className="form-label">Kategorinavn (NO)</label>
                            <input id="meny-field-2" className="form-input" required value={newCategory.name_no} onChange={e => setNewCategory({...newCategory, name_no: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="meny-field-3" className="form-label">Kategorinavn (EN)</label>
                            <input id="meny-field-3" className="form-input" required value={newCategory.name_en} onChange={e => setNewCategory({...newCategory, name_en: e.target.value})} />
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-md)' }}>
                            <button type="submit" className="btn btn-primary">Lagre</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setAddingCategory(false)}>Avbryt</button>
                        </div>
                    </form>
                </div>
            )}

            {!dailyTab && categories.map(cat => (
                <div key={cat.id} className="admin-form-section" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                        <h3>{cat.name_no} <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>({cat.name_en})</span></h3>
                        <div>
                            <button className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => setEditingItem({ category_id: cat.id, is_active: true, price: 0 })}>
                                + Legg til rett
                            </button>
                            {isAdmin && (
                                <button className="btn btn-danger btn-sm" onClick={() => confirmDeleteCategory(cat.id)}>
                                    Slett kategori
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Navn</th>
                                    <th>Beskrivelse</th>
                                    <th>Pris</th>
                                    <th>Handlinger</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cat.items.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <span className={`status-badge ${!!item.is_active ? 'status-confirmed' : 'status-cancelled'}`}>
                                                {!!item.is_active ? 'Aktiv' : 'Deaktivert'}
                                            </span>
                                        </td>
                                        <td>
                                            <strong>{item.name_no}</strong><br />
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{item.name_en}</span>
                                        </td>
                                        <td>
                                            <span>{item.desc_no}</span><br />
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{item.desc_en}</span>
                                        </td>
                                        <td>{item.price} kr</td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingItem(item)}>Rediger</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => confirmDeleteItem(item.id)}>Slett</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {cat.items.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="empty-state" style={{ padding: 'var(--space-md)' }}>Ingen retter i denne kategorien</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            {/* Modal for editing item */}
            {editingItem && (
                <Modal title="Meny" onClose={() => setEditingItem(null)}>
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <h3>{editingItem.id ? 'Rediger Rett' : 'Ny Rett'}</h3>
                        <form onSubmit={handleSaveItem}>
                            <div className="admin-form-grid" style={{ marginTop: 'var(--space-md)' }}>
                                <div className="form-group">
                                    <label htmlFor="meny-field-4" className="form-label">Rettens navn (NO) *</label>
                                    <input id="meny-field-4" className="form-input" required value={editingItem.name_no || ''} onChange={e => setEditingItem({...editingItem, name_no: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="meny-field-5" className="form-label">Rettens navn (EN) *</label>
                                    <input id="meny-field-5" className="form-input" required value={editingItem.name_en || ''} onChange={e => setEditingItem({...editingItem, name_en: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="meny-field-6" className="form-label">Beskrivelse (NO)</label>
                                    <textarea id="meny-field-6" className="form-textarea" style={{ minHeight: '80px' }} value={editingItem.desc_no || ''} onChange={e => setEditingItem({...editingItem, desc_no: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="meny-field-7" className="form-label">Beskrivelse (EN)</label>
                                    <textarea id="meny-field-7" className="form-textarea" style={{ minHeight: '80px' }} value={editingItem.desc_en || ''} onChange={e => setEditingItem({...editingItem, desc_en: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="meny-field-8" className="form-label">Pris (kr) *</label>
                                    <input id="meny-field-8" className="form-input" type="number" required value={editingItem.price || ''} onChange={e => setEditingItem({...editingItem, price: parseInt(e.target.value) || 0})} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="meny-field-9" className="form-label">Status</label>
                                    <select id="meny-field-9" className="form-select" value={editingItem.is_active ? '1' : '0'} onChange={e => setEditingItem({...editingItem, is_active: e.target.value === '1'})}>
                                        <option value="1">Aktiv</option>
                                        <option value="0">Deaktivert</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setEditingItem(null)}>Avbryt</button>
                                <button type="submit" className="btn btn-primary">Lagre</button>
                            </div>
                        </form>
                    </div>
                </Modal>
            )}

            <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
                {toast}
            </div>

            {/* Confirmation Modal */}
            {confirmDialog.isOpen && (
                <Modal title="Meny" onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
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
                    max-height: 90vh;
                    overflow-y: auto;
                }
            `}</style>
        </>
    );
}
