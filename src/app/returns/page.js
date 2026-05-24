'use client';

import React, { useEffect, useState } from 'react';
import SharedNavbar from '../components/SharedNavbar';

export default function ReturnsPage() {
  const [user, setUser] = useState(null);
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state for customer submit
  const [dealId, setDealId] = useState('');
  const [itemCondition, setItemCondition] = useState('good');
  const [damageDescription, setDamageDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Inspector state for vendor
  const [inspecting, setInspecting] = useState(null);
  const [damageStatus, setDamageStatus] = useState('none');
  const [damageCharge, setDamageCharge] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    loadReturns();
  }, [user]);

  async function loadReturns() {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/returns?userId=${user.id}&userRole=${user.role}`);
      const json = await resp.json();
      if (!resp.ok || json.success === false) throw new Error(json.message || 'Gagal memuat retur');
      setReturnsList(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e.message || 'Gagal memuat retur');
    } finally {
      setLoading(false);
    }
  }

  function handlePhotosChange(e) {
    setPhotos(Array.from(e.target.files || []));
  }

  async function submitReturn(e) {
    e.preventDefault();
    if (!user) return alert('Login terlebih dahulu');
    if (!dealId) return alert('Masukkan dealId');
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('dealId', dealId);
      form.append('customerId', user.id);
      form.append('itemCondition', itemCondition);
      form.append('damageDescription', damageDescription || '');
      photos.forEach((p) => form.append('photos', p));

      const r = await fetch('/api/returns', { method: 'POST', body: form });
      const j = await r.json();
      if (!r.ok || j.success === false) throw new Error(j.message || 'Gagal mengajukan retur');
      alert('Retur diajukan');
      setDealId('');
      setDamageDescription('');
      setPhotos([]);
      loadReturns();
    } catch (err) {
      alert(err.message || 'Gagal mengajukan retur');
    } finally {
      setSubmitting(false);
    }
  }

  async function openInspectModal(deal) {
    setInspecting(deal);
    setDamageStatus(deal.damageStatus || 'none');
    setDamageCharge(deal.damageCharge || 0);
    setNotes(deal.inspectionNotes || '');
  }

  async function submitInspection() {
    if (!inspecting || !user) return;
    try {
      const body = {
        dealId: inspecting.id,
        vendorId: user.id,
        damageStatus,
        damageCharge: Number(damageCharge) || 0,
        notes
      };
      const r = await fetch('/api/returns', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok || j.success === false) throw new Error(j.message || 'Gagal menyimpan inspeksi');
      alert('Inspeksi tersimpan');
      setInspecting(null);
      loadReturns();
    } catch (err) {
      alert(err.message || 'Gagal menyimpan inspeksi');
    }
  }

  return (
    <div>
      <SharedNavbar />
      <div style={{ padding: 24 }}>
      <h2>Returns</h2>
      {!user && (
        <div style={{ color: '#6b7280' }}>Silakan login untuk melihat atau mengajukan pengembalian barang.</div>
      )}

      {user && (
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', gap: 18 }}>
            <div style={{ flex: 1 }}>
              <h3>Buat Permintaan Pengembalian Barang (Customer)</h3>
              <form onSubmit={submitReturn}>
                <div style={{ marginBottom: 8 }}>
                  <label>Deal ID</label>
                  <input value={dealId} onChange={(e) => setDealId(e.target.value)} style={{ width: '100%', padding: 8 }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>Kondisi Barang</label>
                  <select value={itemCondition} onChange={(e) => setItemCondition(e.target.value)} style={{ width: '100%', padding: 8 }}>
                    <option value="good">Baik</option>
                    <option value="minor_damage">Rusak ringan</option>
                    <option value="major_damage">Rusak berat</option>
                    <option value="lost">Hilang</option>
                  </select>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>Deskripsi Kerusakan (opsional)</label>
                  <textarea value={damageDescription} onChange={(e) => setDamageDescription(e.target.value)} style={{ width: '100%', padding: 8 }} rows={3} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>Foto Bukti (opsional)</label>
                  <input type="file" multiple accept="image/*" onChange={handlePhotosChange} />
                </div>
                <div>
                  <button type="submit" disabled={submitting} style={{ padding: '8px 12px' }}>{submitting ? 'Mengirim...' : 'Ajukan Pengembalian'}</button>
                </div>
              </form>
            </div>

            <div style={{ flex: 1 }}>
              <h3>Daftar Returns Anda / Vendor</h3>
              {loading ? (
                <div>Memuat...</div>
              ) : error ? (
                <div style={{ color: 'red' }}>{error}</div>
              ) : returnsList.length === 0 ? (
                <div style={{ color: '#6b7280' }}>Tidak ada barang yang direturkan</div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {returnsList.map((d) => (
                    <div key={d.id} style={{ border: '1px solid #e5e7eb', padding: 12, borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{d.service?.title || d.itemName || 'Item'}</div>
                          <div style={{ fontSize: 13, color: '#6b7280' }}>{d.vendorName || d.customerName || ''}</div>
                          <div style={{ fontSize: 13, color: '#6b7280' }}>Tanggal retur: {d.actualReturnDate || '-'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>{d.returnStatus}</div>
                          <div>Refund: Rp {(d.totalRefund || 0).toLocaleString('id-ID')}</div>
                        </div>
                      </div>
                      {Array.isArray(d.returnPhotos) && d.returnPhotos.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          {d.returnPhotos.map((p, idx) => (
                            <a key={idx} href={p.url} target="_blank" rel="noreferrer">
                              <img
                                src={p.url}
                                alt={`foto-${idx}`}
                                style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }}
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                        {user.role === 'vendor' && (
                          <button onClick={() => openInspectModal(d)} style={{ padding: '6px 10px' }}>Inspeksi</button>
                        )}
                        {user.role === 'customer' && (
                          <div style={{ color: '#6b7280', fontSize: 13 }}>Status: {d.returnStatus}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {inspecting && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: 'white', padding: 18, borderRadius: 12, width: 'min(720px, 96%)' }}>
                <h3>Inspeksi Returns - {inspecting.service?.title || inspecting.itemName}</h3>
                {Array.isArray(inspecting.returnPhotos) && inspecting.returnPhotos.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {inspecting.returnPhotos.map((p, idx) => (
                      <img key={idx} src={p.url} style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 6 }} />
                    ))}
                  </div>
                )}

                <div style={{ marginBottom: 8 }}>
                  <label>Damage Status</label>
                  <select value={damageStatus} onChange={(e) => setDamageStatus(e.target.value)} style={{ width: '100%', padding: 8 }}>
                    <option value="none">Tidak ada kerusakan</option>
                    <option value="minor">Kerusakan ringan</option>
                    <option value="major">Kerusakan berat</option>
                    <option value="lost">Hilang</option>
                  </select>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>Damage Charge (Rp)</label>
                  <input value={damageCharge} onChange={(e) => setDamageCharge(e.target.value)} style={{ width: '100%', padding: 8 }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>Catatan</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: 8 }} rows={3} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setInspecting(null)} style={{ padding: '8px 10px' }}>Batal</button>
                  <button onClick={submitInspection} style={{ padding: '8px 12px' }}>Simpan Inspeksi</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
      </div>
  );
}
