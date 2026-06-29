'use client';

import React, { useEffect, useState } from 'react';
import SharedNavbar from '../components/SharedNavbar';
import styles from './returns.module.css';


import { readData, writeData } from '@/lib/storage';
export default function ReturnsPage() {
  const [user, setUser] = useState(null);
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state for customer submit
  const [dealId, setDealId] = useState('');
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceConfirmed, setInvoiceConfirmed] = useState(false);
  const [itemCondition, setItemCondition] = useState('good');
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false);
  const [damageDescription, setDamageDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
    const [mode, setMode] = useState('end');

  // Inspector state for vendor
  const [inspecting, setInspecting] = useState(null);
  const [damageStatus, setDamageStatus] = useState('none');
  const [damageCharge, setDamageCharge] = useState(0);
  const [complaintResolution, setComplaintResolution] = useState('confirm');
  const [complaintPenalty, setComplaintPenalty] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  // Debounced invoice lookup when user types an Invoice ID
  useEffect(() => {
    setInvoicePreview(null);
    setInvoiceError('');
    setInvoiceConfirmed(false);
    const v = (dealId || '').trim();
    if (!v) return;

    const normalized = v.replace(/^#/, '').trim();
    const looksLikeInvoice = /inv/i.test(normalized);
    if (!looksLikeInvoice) return;

    let cancelled = false;
    setInvoiceLoading(true);
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch('/api/invoices');
        if (!resp.ok) throw new Error('Gagal mengambil daftar invoice');
        const list = await resp.json();
        const searchKey = normalized.toLowerCase();
        const found = list.find((inv) => {
          if (!inv || !inv.id) return false;
          const idLower = String(inv.id).toLowerCase();
          if (idLower === searchKey) return true;
          if (idLower.includes(searchKey.replace(/^#/, ''))) return true;
          const digits = searchKey.replace(/[^0-9]/g, '');
          if (digits && idLower.includes(digits)) return true;
          return false;
        });
        if (cancelled) return;
        if (!found) {
          setInvoicePreview(null);
          setInvoiceError('Invoice tidak ditemukan');
        } else {
          setInvoicePreview(found);
          setInvoiceError('');
        }
      } catch (err) {
        if (!cancelled) setInvoiceError(err.message || 'Gagal mencari invoice');
      } finally {
        if (!cancelled) setInvoiceLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dealId]);

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
      if (!resp.ok || json.success === false) throw new Error(json.message || 'Gagal memuat return');
      setReturnsList(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e.message || 'Gagal memuat return');
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
    if (!dealId) return alert('Masukkan Deal ID atau Invoice ID (contoh: #INV-1778)');
    setSubmitting(true);
    try {
      // Resolve if user entered an Invoice ID like INV-... or #INV-...
      let targetDealId = dealId.trim();
      // If user already confirmed an invoice preview, prefer it
      if (invoiceConfirmed && invoicePreview) {
        targetDealId = invoicePreview.dealId || invoicePreview.id || targetDealId;
      }
      const normalized = targetDealId.replace(/^#/, '').trim();
      const looksLikeInvoice = /inv/i.test(normalized);
      if (looksLikeInvoice && !invoiceConfirmed) {
        // If input looks like invoice but user didn't confirm preview, try to resolve now
        const respInv = await fetch('/api/invoices');
        if (!respInv.ok) throw new Error('Gagal mengambil data invoice');
        const invList = await respInv.json();
        const searchKey = normalized.toLowerCase();
        const found = invList.find((inv) => {
          if (!inv || !inv.id) return false;
          const idLower = String(inv.id).toLowerCase();
          if (idLower === searchKey) return true;
          if (idLower.includes(searchKey.replace(/^#/, ''))) return true;
          const digits = searchKey.replace(/[^0-9]/g, '');
          if (digits && idLower.includes(digits)) return true;
          return false;
        });

        if (!found) {
          throw new Error('Invoice tidak ditemukan. Pastikan ID benar.');
        }
        targetDealId = found.dealId || targetDealId;
      }

      const form = new FormData();
      form.append('dealId', targetDealId);
      form.append('type', mode === 'complaint' ? 'complaint' : 'end_of_use');
      form.append('customerId', user.id);
      form.append('itemCondition', itemCondition);
      form.append('damageDescription', damageDescription || '');
      photos.forEach((p) => form.append('photos', p));

      const r = await fetch('/api/returns', { method: 'POST', body: form });
      const j = await r.json();
      if (!r.ok || j.success === false) throw new Error(j.message || 'Gagal mengajukan return');
      alert(mode === 'complaint' ? 'complaint diajukan' : 'return diajukan');
      setDealId('');
      setDamageDescription('');
      setPhotos([]);
      loadReturns();
    } catch (err) {
      alert(err.message || 'Gagal mengajukan return');
    } finally {
      setSubmitting(false);
    }
  }

  async function openInspectModal(deal) {
    setInspecting(deal);
    setDamageStatus(deal.damageStatus || 'none');
    setDamageCharge(deal.damageCharge || 0);
    setComplaintResolution(deal.complaintResolution || 'confirm');
    setComplaintPenalty(deal.complaintPenalty?.toString() || '0');
    setNotes(deal.inspectionNotes || deal.complaintResolutionNotes || '');
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
      if (inspecting.returnType === 'complaint') {
        body.complaintResolution = complaintResolution;
        body.complaintPenalty = Number(complaintPenalty) || 0;
      }
      const r = await fetch('/api/returns', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok || j.success === false) throw new Error(j.message || 'Gagal menyimpan inspeksi');
      alert(inspecting.returnType === 'complaint' ? 'Resolusi complaint tersimpan' : 'Inspeksi tersimpan');
      setInspecting(null);
      loadReturns();
    } catch (err) {
      alert(err.message || 'Gagal menyimpan inspeksi');
    }
  }

  async function confirmReturnByCustomer(deal) {
    if (!deal || !user) return;
    const confirmed = window.confirm('Konfirmasi denda dan selesaikan return ini?');
    if (!confirmed) return;

    try {
      const r = await fetch('/api/returns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId: deal.returnId || deal.id,
          dealId: deal.dealId || deal.id,
          customerId: user.id
        })
      });
      const j = await r.json();
      if (!r.ok || j.success === false) {
        throw new Error(j.message || 'Gagal konfirmasi return');
      }
      alert('Return selesai dikonfirmasi');
      loadReturns();
    } catch (err) {
      alert(err.message || 'Gagal konfirmasi return');
    }
  }

  return (
    <div>
      <SharedNavbar />
      <div className={styles.container}>
      <h2>{mode === 'end' ? 'Retur (Pengembalian Akhir)' : 'Complaint (Lapor Keluhan)'}</h2>
      <div style={{ margin: '12px 0 18px', display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => setMode('end')} className={mode === 'end' ? styles.btn : styles.btn + ' ' + styles.secondary}>Retur</button>
        <button type="button" onClick={() => setMode('complaint')} className={mode === 'complaint' ? styles.btn : styles.btn + ' ' + styles.secondary}>Complaint</button>
      </div>
      {!user && (
        <div style={{ color: '#6b7280' }}>Silakan login untuk melihat atau mengajukan retur atau complaint.</div>
      )}

      {user && (
        <div className={styles.grid}>
          <div className={styles.columns}>
            <div className={styles.column}>
              <h3>{mode === 'end' ? 'Buat Permintaan Return Barang (Customer)' : 'Buat Laporan Complaint (Customer)'}</h3>
              {mode === 'complaint' && (
                <div style={{ marginBottom: 16, padding: 16, borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                  <strong>Complaint</strong> digunakan untuk melaporkan kerusakan, ketidaknyamanan, atau masalah layanan dari vendor.
                </div>
              )}
              <form onSubmit={submitReturn}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Invoice / Deal ID</label>
                  <input placeholder="Contoh: #INV-1778 atau DEAL-123" className={styles.input} value={dealId} onChange={(e) => setDealId(e.target.value)} />
                  {invoiceLoading && <div className={styles.small} style={{ color: '#6b7280', marginTop: 6 }}>Mencari invoice...</div>}
                  {invoiceError && <div className={styles.small} style={{ color: 'crimson', marginTop: 6 }}>{invoiceError}</div>}
                  {invoicePreview && (
                    <div className={styles.invoicePreview} style={{ marginTop: 10, padding: 10, borderRadius: 8, background: '#fff', border: '1px solid #e6e6e6' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {invoicePreview.serviceImage && <img src={invoicePreview.serviceImage} alt="img" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{invoicePreview.serviceTitle}</div>
                          <div className={styles.small}>{invoicePreview.vendorName} • {invoicePreview.customerName}</div>
                          <div className={styles.small}>Invoice: {invoicePreview.id} — Deal: {invoicePreview.dealId || '-'}</div>
                          <div className={styles.small}>Total: Rp {(Number(invoicePreview.totalAmount || invoicePreview.remainingPayment || 0)).toLocaleString('id-ID')}</div>
                        </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                            <button type="button" className={styles.btn} onClick={() => setInvoiceDetailOpen(true)}>Lihat detail</button>
                            <button type="button" className={styles.btn} onClick={() => { setDealId(invoicePreview.dealId || invoicePreview.id); setInvoiceConfirmed(true); }}>Gunakan invoice ini</button>
                            <button type="button" className={styles.secondary} onClick={() => { setInvoicePreview(null); setDealId(''); }}>Batal</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{mode === 'complaint' ? 'Jenis Complaint' : 'Kondisi Barang'}</label>
                  <select className={styles.select} value={itemCondition} onChange={(e) => setItemCondition(e.target.value)}>
                    {mode === 'complaint' ? (
                      <>
                        <option value="damage">Kerusakan Barang / Jasa</option>
                        <option value="service_quality">Kualitas Jasa Buruk</option>
                        <option value="inconvenience">Ketidaknyamanan / Pelayanan</option>
                        <option value="delayed">Keterlambatan Layanan</option>
                        <option value="other">Lainnya</option>
                      </>
                    ) : (
                      <>
                        <option value="good">Baik</option>
                        <option value="minor_damage">Rusak ringan</option>
                        <option value="major_damage">Rusak berat</option>
                        <option value="lost">Hilang</option>
                      </>
                    )}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{mode === 'complaint' ? 'Deskripsi Complaint (opsional)' : 'Deskripsi Kerusakan (opsional)'}</label>
                  <textarea className={styles.textarea} value={damageDescription} onChange={(e) => setDamageDescription(e.target.value)} rows={3} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Foto Bukti (opsional)</label>
                  <input className={styles.fileInput} type="file" multiple accept="image/*" onChange={handlePhotosChange} />
                </div>
                <div className={styles.actions}>
                  <button className={styles.btn} type="submit" disabled={submitting}>{submitting ? 'Mengirim...' : mode === 'complaint' ? 'Ajukan Complaint' : 'Ajukan Pengembalian'}</button>
                </div>
              </form>
            </div>

            <div className={styles.column}>
              <h3>{mode === 'end' ? 'Daftar Return Anda / Vendor' : 'Daftar Complaint Anda / Vendor'}</h3>
              {loading ? (
                <div>Memuat...</div>
              ) : error ? (
                <div style={{ color: 'red' }}>{error}</div>
              ) : returnsList.length === 0 ? (
                <div style={{ color: '#6b7280' }}>Tidak ada return yang tercatat</div>
              ) : (
                <div className={styles.listGrid}>
                  {returnsList
                    .filter((d) => {
                      const t = d.returnType || 'end_of_use';
                      return mode === 'end' ? t === 'end_of_use' : (t === 'issue' || t === 'complaint');
                    })
                    .map((d) => (
                    (() => {
                      const isVendorOnThisReturn = String(d.vendorId || '') === String(user?.id || '');
                      const isCustomerOnThisReturn = String(d.customerId || '') === String(user?.id || '');
                      const vendorConfirmed = Boolean(
                        d.vendorConfirmed ?? d.isVendorConfirmed ?? d.is_vendor_confirmed
                      );
                      const customerConfirmed = Boolean(
                        d.customerConfirmed ?? d.isCustomerConfirmed ?? d.is_customer_confirmed
                      );

                      return (
                    <div key={d.id} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div className={styles.cardTitle}>{d.service?.title || d.itemName || 'Item'}</div>
                            <div className={styles.small} style={{ padding: '4px 8px', borderRadius: 6, background: '#f3f4f6' }}>{(d.returnType === 'issue' || d.returnType === 'complaint' ? 'Complaint' : 'Retur')}</div>
                          </div>
                          <div className={`${styles.small} ${styles.muted}`}>{d.vendorName || d.customerName || ''}</div>
                          <div className={`${styles.small} ${styles.muted}`}>Tanggal laporan: {d.reportedAt || d.actualReturnDate || '-'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className={styles.statusBadge}>{d.returnStatus}</div>
                          {mode === 'end' ? (
                            <div>Refund: Rp {(d.totalRefund || 0).toLocaleString('id-ID')}</div>
                          ) : (
                            <div style={{ fontSize: '13px', color: '#4b5563' }}>{d.complaintResolution ? d.complaintResolution.replace(/_/g, ' ') : 'Belum diproses'}</div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: 8, padding: '12px 0', borderBottom: mode === 'complaint' ? '1px solid #e5e7eb' : 'none' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', color: '#4b5563' }}>
                          <div><strong>{mode === 'complaint' ? 'Jenis Complaint' : 'Kondisi'}</strong><br />{d.complaintCategory || d.itemCondition || '-'}</div>
                          <div><strong>{mode === 'complaint' ? 'Catatan Komplain' : 'Deskripsi'}</strong><br />{d.complaintDescription || d.damageDescription || '-'}</div>
                        </div>
                        {mode === 'complaint' && d.returnPhotos?.length > 0 && (
                          <div style={{ fontSize: '13px', color: '#4b5563' }}><strong>Foto bukti:</strong> {d.returnPhotos.length} file terlampir</div>
                        )}
                      </div>
                      {Array.isArray(d.returnPhotos) && d.returnPhotos.length > 0 && (
                        <div className={styles.photos}>
                          {d.returnPhotos.map((p, idx) => (
                            <a key={idx} href={p.url} target="_blank" rel="noreferrer">
                              <img
                                src={p.url}
                                alt={`foto-${idx}`}
                                className={styles.photoImg}
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                        {isVendorOnThisReturn && (
                          <button onClick={() => openInspectModal(d)} className={`${styles.btn} ${styles.secondary}`}>{mode === 'complaint' ? 'Tindak Complaint' : 'Inspeksi'}</button>
                        )}
                        {isCustomerOnThisReturn && (
                          <div style={{ width: '100%' }}>
                            <div className={`${styles.muted} ${styles.small}`}>Status: {d.returnStatus}</div>
                            <div style={{ marginTop: 6, padding: '10px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f8fafc' }}>
                              <div className={styles.small}><strong>{d.returnType === 'complaint' ? 'Hasil Tindak Complaint:' : 'Hasil inspeksi vendor:'}</strong></div>
                              {d.returnType === 'complaint' ? (
                                <>
                                  <div className={styles.small}>Resolusi: {d.complaintResolution ? d.complaintResolution.replace(/_/g, ' ') : '-'}</div>
                                  <div className={styles.small}>Denda / potongan: Rp {Number(d.complaintPenalty || 0).toLocaleString('id-ID')}</div>
                                  <div className={styles.small}>Refund akhir: Rp {Number(d.totalRefund || 0).toLocaleString('id-ID')}</div>
                                  {d.complaintResolutionNotes && (
                                    <div className={styles.small} style={{ marginTop: 6 }}>
                                      Catatan vendor: {d.complaintResolutionNotes}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className={styles.small}>Damage status: {d.damageStatus || '-'}</div>
                                  <div className={styles.small}>Biaya kerusakan: Rp {Number(d.damageCharge || 0).toLocaleString('id-ID')}</div>
                                  <div className={styles.small}>Biaya keterlambatan: Rp {Number(d.lateCharge || 0).toLocaleString('id-ID')}</div>
                                  <div className={styles.small}>Refund akhir: Rp {Number(d.totalRefund || 0).toLocaleString('id-ID')}</div>
                                  {d.damageInvoiceId && (
                                    <div className={styles.small} style={{ marginTop: 6 }}>
                                      Invoice kerusakan: {d.damageInvoiceId} ({d.damageInvoiceStatus || 'pending'})
                                      {isCustomerOnThisReturn && d.damageInvoiceStatus === 'pending' && (
                                        <a href="/customer/invoices" style={{ color: '#B28A67', textDecoration: 'underline', marginLeft: 6 }}>Bayar kerusakan</a>
                                      )}
                                    </div>
                                  )}
                                  {d.inspectionNotes && (
                                    <div className={styles.small} style={{ marginTop: 6 }}>
                                      Catatan vendor: {d.inspectionNotes}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                              {!vendorConfirmed && (
                                <button type="button" className={`${styles.btn} ${styles.secondary}`} disabled>
                                  Menunggu inspeksi vendor
                                </button>
                              )}
                              {vendorConfirmed && !customerConfirmed && (
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.danger}`}
                                  onClick={() => confirmReturnByCustomer(d)}
                                >
                                  Konfirmasi Denda & Selesaikan Return
                                </button>
                              )}
                              {customerConfirmed && (
                                <button type="button" className={`${styles.btn} ${styles.success}`} disabled>
                                  Return Selesai
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                      );
                    })()
                  ))}
                </div>
              )}
            </div>
          </div>

          {inspecting && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3>{(inspecting.returnType === 'complaint' || inspecting.returnType === 'issue') ? 'Tindak Complaint' : 'Inspeksi Return'} - {inspecting.service?.title || inspecting.itemName}</h3>
                {Array.isArray(inspecting.returnPhotos) && inspecting.returnPhotos.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {inspecting.returnPhotos.map((p, idx) => (
                      <img key={idx} src={p.url} style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 6 }} />
                    ))}
                  </div>
                )}

                {(inspecting?.returnType === 'complaint' || inspecting?.returnType === 'issue') && (
                  <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, border: '1px solid #e5e7eb', background: '#f8fafc' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Detail Complaint</div>
                    <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}><strong>Jenis:</strong> {inspecting.complaintCategory || inspecting.itemCondition || '-'}</div>
                    <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}><strong>Deskripsi:</strong> {inspecting.complaintDescription || inspecting.damageDescription || '-'}</div>
                    <div style={{ fontSize: 13, color: '#4b5563' }}><strong>Tanggal laporan:</strong> {inspecting.complaintDate ? new Date(inspecting.complaintDate).toLocaleString('id-ID') : (inspecting.reportedAt ? new Date(inspecting.reportedAt).toLocaleString('id-ID') : '-')}</div>
                  </div>
                )}

                {(inspecting?.returnType === 'complaint' || inspecting?.returnType === 'issue') ? (
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <label className={styles.label}>Resolusi Complaint</label>
                      <select className={styles.select} value={complaintResolution} onChange={(e) => setComplaintResolution(e.target.value)}>
                        <option value="confirm">Setujui Complaint (Full Refund)</option>
                        <option value="partial_refund">Partial Refund</option>
                        <option value="penalty">Terapkan Denda</option>
                        <option value="reject">Tolak Complaint</option>
                      </select>
                    </div>
                    {(complaintResolution === 'partial_refund' || complaintResolution === 'penalty') && (
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Nominal (Rp)</label>
                        <input type="number" className={styles.input} value={complaintPenalty} onChange={(e) => setComplaintPenalty(e.target.value)} />
                      </div>
                    )}
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Catatan Tindak Lanjut</label>
                      <textarea className={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <label className={styles.label}>Damage Status</label>
                      <select className={styles.select} value={damageStatus} onChange={(e) => setDamageStatus(e.target.value)}>
                        <option value="none">Tidak ada kerusakan</option>
                        <option value="minor">Kerusakan ringan</option>
                        <option value="major">Kerusakan berat</option>
                        <option value="lost">Hilang</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Damage Charge (Rp)</label>
                      <input className={styles.input} value={damageCharge} onChange={(e) => setDamageCharge(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Catatan</label>
                      <textarea className={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                    </div>
                  </>
                )}
                <div className={styles.modalFooter}>
                  <button onClick={() => setInspecting(null)} className={`${styles.btn} ${styles.secondary}`}>Batal</button>
                  <button onClick={submitInspection} className={styles.btn}>{inspecting?.returnType === 'complaint' ? 'Simpan Resolusi Complaint' : 'Simpan Inspeksi'}</button>
                </div>
              </div>
            </div>
          )}
          {invoiceDetailOpen && invoicePreview && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3>Detail Invoice - {invoicePreview.id}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className={styles.small}><strong>Invoice ID:</strong> {invoicePreview.id}</div>
                  <div className={styles.small}><strong>Deal ID:</strong> {invoicePreview.dealId || '-'}</div>
                  <div className={styles.small}><strong>Layanan:</strong> {invoicePreview.serviceTitle}</div>
                  <div className={styles.small}><strong>Vendor:</strong> {invoicePreview.vendorName}</div>
                  <div className={styles.small}><strong>Customer:</strong> {invoicePreview.customerName}</div>
                  <div className={styles.small}><strong>Jumlah:</strong> {invoicePreview.quantity || 1}</div>
                  <div className={styles.small}><strong>Durasi (hari):</strong> {invoicePreview.durationDays || 1}</div>
                  <div className={styles.small}><strong>Base Price:</strong> Rp {(Number(invoicePreview.basePrice || 0)).toLocaleString('id-ID')}</div>
                  <div className={styles.small}><strong>Diskon:</strong> Rp {(Number(invoicePreview.discountAmount || 0)).toLocaleString('id-ID')}</div>
                  <div className={styles.small}><strong>Total:</strong> Rp {(Number(invoicePreview.totalAmount || invoicePreview.remainingPayment || 0)).toLocaleString('id-ID')}</div>
                  <div className={styles.small}><strong>Tipe Pembayaran:</strong> {invoicePreview.paymentType}</div>
                  <div className={styles.small}><strong>Status:</strong> {invoicePreview.status}</div>
                  <div className={styles.small}><strong>Batas Bayar:</strong> {invoicePreview.dueDateLabel || invoicePreview.paymentDeadline || '-'}</div>
                  <div className={styles.small}><strong>Dibuat:</strong> {invoicePreview.createdAt ? new Date(invoicePreview.createdAt).toLocaleString('id-ID') : '-'}</div>
                  <div className={styles.small} style={{ gridColumn: '1 / -1' }}><strong>Catatan:</strong> {invoicePreview.notes || '-'}</div>
                </div>
                <div className={styles.modalFooter} style={{ marginTop: 12 }}>
                  <button className={`${styles.btn} ${styles.secondary}`} onClick={() => setInvoiceDetailOpen(false)}>Tutup</button>
                  <button className={styles.btn} onClick={() => { setDealId(invoicePreview.dealId || invoicePreview.id); setInvoiceConfirmed(true); setInvoiceDetailOpen(false); }}>Gunakan invoice ini</button>
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
