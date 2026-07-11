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
  const [invoiceSummary, setInvoiceSummary] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceConfirmed, setInvoiceConfirmed] = useState(false);
  const [itemCondition, setItemCondition] = useState('good');
  const [lostQuantity, setLostQuantity] = useState(0);
  const [lostError, setLostError] = useState('');
  const [fineAmount, setFineAmount] = useState(0);
  const [codLocation, setCodLocation] = useState('');
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false);
  const [damageDescription, setDamageDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const normalizeItemCondition = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return null;

    if (['good', 'baik'].includes(raw)) {
      return { code: 'good', label: 'Baik', percentage: 0 };
    }
    if (['goresan', 'scratch', 'minor_damage', 'minor', 'rusak ringan', 'rusak_ringan'].includes(raw)) {
      return { code: 'goresan', label: 'Goresan', percentage: 0.2 };
    }
    if (['rusak', 'rusak berat', 'major_damage', 'major', 'rusak_berat'].includes(raw)) {
      return { code: 'rusak', label: 'Rusak', percentage: 0.5 };
    }
    if (['hilang', 'lost'].includes(raw)) {
      return { code: 'hilang', label: 'Hilang', percentage: 1.0 };
    }

    return null;
  };

  const getConditionLabel = (value) => {
    const condition = normalizeItemCondition(value);
    return condition ? condition.label : (value || '-');
  };

  const formatCurrency = (amount) => {
    return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;
  };

  // Inspector state for vendor
  const [inspecting, setInspecting] = useState(null);
  const [vendorAction, setVendorAction] = useState('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  // Debounced tagihan lookup when user types a Tagihan ID
  useEffect(() => {
    setInvoicePreview(null);
    setInvoiceSummary(null);
    setInvoiceError('');
    setInvoiceConfirmed(false);
    setFineAmount(0);
    setLostQuantity(0);
    setLostError('');
    const v = (dealId || '').trim();
    if (!v) return;

    const normalized = v.replace(/^#/, '').trim();
    if (!normalized) return;

    let cancelled = false;
    setInvoiceLoading(true);
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/returns?invoiceId=${encodeURIComponent(normalized)}`);
        const json = await resp.json();
        if (cancelled) return;
        if (!resp.ok || json.success === false) {
          setInvoicePreview(null);
          setInvoiceSummary(null);
          setInvoiceError(json.message || 'Tagihan tidak ditemukan');
        } else {
          setInvoicePreview(json.data);
          setInvoiceSummary(json.data.orderSummary || null);
          setInvoiceError('');
        }
      } catch (err) {
        if (!cancelled) setInvoiceError(err.message || 'Gagal mencari tagihan');
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

  useEffect(() => {
    if (!invoiceSummary) {
      setFineAmount(0);
      return;
    }

    const totalAmount = Number(invoiceSummary.totalAmount || 0);
    const totalQuantity = Number(invoiceSummary.totalQuantity || 1);
    const condition = normalizeItemCondition(itemCondition);

    if (!condition) {
      setFineAmount(0);
      return;
    }

    if (condition.code === 'good') {
      setFineAmount(0);
      setLostError('');
      return;
    }

    if (condition.code === 'goresan' || condition.code === 'rusak') {
      setFineAmount(Math.round(totalAmount * (condition.percentage || 0)));
      setLostError('');
      return;
    }

    if (condition.code === 'hilang') {
      const lost = Number(lostQuantity || 0);
      const validLost = Math.max(0, lost);
      if (validLost <= 0) {
        setLostError('Masukkan jumlah barang hilang');
        setFineAmount(0);
        return;
      }
      if (validLost > totalQuantity) {
        setLostError('Jumlah barang hilang tidak boleh lebih dari total sewa');
        setFineAmount(0);
        return;
      }
      setLostError('');
      const portion = totalQuantity > 0 ? validLost / totalQuantity : 1;
      setFineAmount(Math.round(totalAmount * portion));
      return;
    }

    setFineAmount(0);
  }, [itemCondition, invoiceSummary, lostQuantity]);

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
    if (!dealId) return alert('Masukkan Deal ID atau Tagihan ID (contoh: #INV-1778)');
    setSubmitting(true);
    try {
      // Resolve if user entered a Tagihan ID like INV-... or #INV-...
      let targetDealId = dealId.trim();
      // If user already confirmed a tagihan preview, prefer it
      if (invoiceConfirmed && invoicePreview) {
        targetDealId = invoicePreview.dealId || invoicePreview.invoiceId || targetDealId;
      }
      const normalized = targetDealId.replace(/^#/, '').trim();
      const looksLikeInvoice = /inv/i.test(normalized);
      if (looksLikeInvoice && !invoiceConfirmed) {
        const resp = await fetch(`/api/returns?invoiceId=${encodeURIComponent(normalized)}`);
        const json = await resp.json();
        if (!resp.ok || json.success === false || !json.data) {
          throw new Error(json.message || 'Tagihan tidak ditemukan. Pastikan ID benar.');
        }
        targetDealId = json.data.dealId || json.data.invoiceId || targetDealId;
      }

      if (itemCondition === 'hilang' && invoiceSummary) {
        const lost = Number(lostQuantity || 0);
        if (lost < 0 || lost > Number(invoiceSummary.totalQuantity || 0)) {
          throw new Error('Jumlah barang hilang tidak valid');
        }
      }

      const form = new FormData();
      form.append('dealId', targetDealId);
      form.append('type', 'end_of_use');
      form.append('customerId', user.id);
      form.append('itemCondition', itemCondition);
      form.append('damageDescription', damageDescription || '');
      form.append('codLocationDetail', codLocation || '');
      form.append('fineAmount', fineAmount);
      form.append('codStatus', 'Pending');
      form.append('codCondition', itemCondition);
      if (itemCondition === 'hilang') {
        form.append('lostQuantity', lostQuantity);
      }
      photos.forEach((p) => form.append('photos', p));

      const r = await fetch('/api/returns', { method: 'POST', body: form });
      const j = await r.json();
      if (!r.ok || j.success === false) throw new Error(j.message || 'Gagal mengajukan return');
      alert('Return diajukan');
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
    setNotes(deal.inspectionNotes || '');
    setVendorAction(deal.returnStatus === 'rejected' ? 'reject' : 'approve');
    setRejectionReason(deal.rejectionReason || '');
  }

  async function submitInspection(action) {
    if (!inspecting || !user) return;
    const selectedAction = action || vendorAction;
    setVendorAction(selectedAction);
    if (selectedAction === 'reject' && !rejectionReason.trim()) {
      return alert('Alasan penolakan wajib diisi');
    }

    try {
      const body = {
        dealId: inspecting.id,
        vendorId: user.id,
        action: selectedAction,
        notes,
        rejectionReason: selectedAction === 'reject' ? rejectionReason : ''
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
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Retur (Pengembalian Akhir)</h2>
          <p className={styles.pageSubtitle}>
            Ajukan retur dan cek estimasi denda secara otomatis dari tagihan atau deal Anda.
          </p>
        </div>
        {!user && (
          <div style={{ color: '#6b7280' }}>Silakan login untuk melihat atau mengajukan retur.</div>
        )}

      {user && (
        <div className={styles.grid}>
          <div className={styles.columns}>
            <div className={styles.column}>
              <h3>Ajukan Retur Barang</h3>
              <p className={styles.fieldCaption}>Masukkan Tagihan atau Deal ID untuk melihat rincian pesanan dan estimasi denda secara otomatis.</p>
              <form onSubmit={submitReturn}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tagihan / Deal ID</label>
                  <input placeholder="Contoh: #INV-1778 atau DEAL-123" className={styles.input} value={dealId} onChange={(e) => setDealId(e.target.value)} />
                  {invoiceLoading && <div className={styles.small} style={{ color: '#6b7280', marginTop: 6 }}>Mencari tagihan...</div>}
                  {invoiceError && <div className={styles.small} style={{ color: 'crimson', marginTop: 6 }}>{invoiceError}</div>}
                  {invoicePreview && (
                    <div className={styles.invoicePreview} style={{ marginTop: 14 }}>
                      <div className={styles.invoicePreviewHeader}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{invoicePreview.serviceTitle}</div>
                          <div className={styles.invoicePreviewMain}>
                            <div>{invoicePreview.vendorName} • {invoicePreview.customerName}</div>
                            <div><strong>Tagihan:</strong> {invoicePreview.invoiceId}</div>
                            <div><strong>Deal:</strong> {invoicePreview.dealId || '-'}</div>
                            <div><strong>Total:</strong> Rp {(Number(invoicePreview.totalAmount || invoicePreview.remainingPayment || 0)).toLocaleString('id-ID')}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
                          <button type="button" className={styles.btn} onClick={() => setInvoiceDetailOpen(true)}>Lihat detail</button>
                          <button type="button" className={styles.btn} onClick={() => { setDealId(invoicePreview.dealId || invoicePreview.invoiceId); setInvoiceConfirmed(true); }}>Gunakan tagihan ini</button>
                          <button type="button" className={styles.secondary} onClick={() => { setInvoicePreview(null); setDealId(''); }}>Batal</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Kondisi Barang</label>
                  <select className={styles.select} value={itemCondition} onChange={(e) => setItemCondition(e.target.value)}>
                    <option value="good">Baik</option>
                    <option value="goresan">Goresan</option>
                    <option value="rusak">Rusak</option>
                    <option value="hilang">Hilang</option>
                  </select>
                </div>
                {invoiceSummary && (
                  <div style={{ marginBottom: 14, padding: 14, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fafafa' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Ringkasan Invoice</div>
                    <div style={{ display: 'grid', gap: 6, fontSize: 13, color: '#4b5563' }}>
                      <div><strong>Nama Barang:</strong> {invoiceSummary.itemName}</div>
                      <div><strong>Harga Sewa:</strong> Rp {Number(invoiceSummary.rentalPrice || 0).toLocaleString('id-ID')}</div>
                      <div><strong>Jumlah Sewa:</strong> {invoiceSummary.totalQuantity}</div>
                      <div><strong>Durasi:</strong> {invoiceSummary.durationDays} hari</div>
                      <div><strong>Total Transaksi:</strong> Rp {Number(invoiceSummary.totalAmount || 0).toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                )}
                {itemCondition === 'hilang' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Jumlah Barang Hilang</label>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      max={invoiceSummary?.totalQuantity || 1}
                      value={lostQuantity}
                      onChange={(e) => setLostQuantity(Number(e.target.value || 0))}
                    />
                    {invoiceSummary && (
                      <div className={styles.small} style={{ color: '#6b7280' }}>
                        Total jumlah sewa: {invoiceSummary.totalQuantity}
                      </div>
                    )}
                    {lostError && <div className={styles.small} style={{ color: 'crimson' }}>{lostError}</div>}
                  </div>
                )}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Estimasi Denda</label>
                  <div style={{ fontWeight: 700, color: '#111827' }}>Rp {Number(fineAmount || 0).toLocaleString('id-ID')}</div>
                  <div className={styles.small} style={{ color: '#6b7280' }}>
                    Denda dihitung berdasarkan kondisi dan harga sewa invoice.
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Lokasi COD</label>
                  <textarea
                    className={styles.textarea}
                    value={codLocation}
                    onChange={(e) => setCodLocation(e.target.value)}
                    rows={3}
                    placeholder="Tuliskan alamat pertemuan COD dengan vendor untuk pengembalian barang"
                  />
                  <div className={styles.small} style={{ color: '#6b7280' }}>
                    Lokasi ini digunakan sebagai titik temu untuk proses pengembalian ke vendor.
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Deskripsi Kerusakan (opsional)</label>
                  <textarea className={styles.textarea} value={damageDescription} onChange={(e) => setDamageDescription(e.target.value)} rows={3} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Foto Bukti (opsional)</label>
                  <input className={styles.fileInput} type="file" multiple accept="image/*" onChange={handlePhotosChange} />
                </div>
                <div className={styles.actions}>
                  <button className={styles.btn} type="submit" disabled={submitting}>{submitting ? 'Mengirim...' : 'Ajukan retur ke vendor'}</button>
                </div>
              </form>
            </div>

            <div className={styles.column}>
              <h3>Daftar Return Anda / Vendor</h3>
              {loading ? (
                <div>Memuat...</div>
              ) : error ? (
                <div style={{ color: 'red' }}>{error}</div>
              ) : returnsList.length === 0 ? (
                <div style={{ color: '#6b7280' }}>Tidak ada return yang tercatat</div>
              ) : (
                <div className={styles.listGrid}>
                  {returnsList
                    .filter((d) => (d.returnType || 'end_of_use') === 'end_of_use')
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
                            <div className={styles.small} style={{ padding: '4px 8px', borderRadius: 6, background: '#f3f4f6' }}>Retur</div>
                          </div>
                          <div className={`${styles.small} ${styles.muted}`}>{d.vendorName || d.customerName || ''}</div>
                          <div className={`${styles.small} ${styles.muted}`}>Tanggal laporan: {d.reportedAt || d.actualReturnDate || '-'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className={styles.statusBadge}>{d.returnStatus}</div>
                          <div style={{ fontSize: '13px', color: '#4b5563' }}>Biaya akhir dihitung setelah inspeksi vendor</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: 14, padding: '12px 0' }}>
                        <div style={{ display: 'grid', gap: 10, fontSize: '13px', color: '#4b5563' }}>
                          <div><strong>Invoice / Deal:</strong> {d.invoiceId || d.dealId || '-'}</div>
                          <div><strong>Kondisi customer:</strong> {getConditionLabel(d.itemCondition)}</div>
                          {String(d.itemCondition || '').toLowerCase().includes('hilang') && (
                            <div><strong>Jumlah hilang:</strong> {d.lostQuantity || 0}</div>
                          )}
                          <div><strong>Lokasi COD:</strong> {d.codLocationDetail || d.codLocation || '-'}</div>
                          <div><strong>Deskripsi customer:</strong> {d.damageDescription || '-'}</div>
                          <div><strong>Total denda customer:</strong> {formatCurrency(Number(d.damageCharge || 0) + Number(d.lateCharge || 0))}</div>
                          <div><strong>Status inspeksi:</strong> {d.returnStatus || '-'}</div>
                        </div>
                        {d.returnPhotos?.length > 0 && (
                          <div style={{ fontSize: '13px', color: '#4b5563' }}><strong>Foto bukti:</strong> {d.returnPhotos.length} file terlampir</div>
                        )}
                        {d.rejectionReason && (
                          <div style={{ fontSize: '13px', color: '#b91c1c', background: '#fef2f2', padding: '10px', borderRadius: 8 }}>
                            <strong>Alasan penolakan:</strong> {d.rejectionReason}
                          </div>
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

                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {isVendorOnThisReturn && (
                          <button onClick={() => openInspectModal(d)} className={`${styles.btn} ${styles.secondary}`}>Inspeksi</button>
                        )}
                        {isCustomerOnThisReturn && (
                          <div style={{ width: '100%' }}>
                            <div className={`${styles.muted} ${styles.small}`}>Status: {d.returnStatus}</div>
                            <div style={{ marginTop: 6, padding: '10px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f8fafc' }}>
                              <div className={styles.small}><strong>Hasil inspeksi vendor:</strong></div>
                              <div className={styles.small}>Damage status: {d.damageStatus || '-'}</div>
                              <div className={styles.small}>Biaya kerusakan: Rp {Number(d.damageCharge || 0).toLocaleString('id-ID')}</div>
                              <div className={styles.small}>Biaya keterlambatan: Rp {Number(d.lateCharge || 0).toLocaleString('id-ID')}</div>
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
                              {d.rejectionReason && (
                                <div style={{ fontSize: '13px', color: '#b91c1c', background: '#fef2f2', padding: '10px', borderRadius: 8, marginTop: 8 }}>
                                  <strong>Alasan penolakan:</strong> {d.rejectionReason}
                                </div>
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
                <h3>Inspeksi Return - {inspecting.service?.title || inspecting.itemName}</h3>
                {Array.isArray(inspecting.returnPhotos) && inspecting.returnPhotos.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {inspecting.returnPhotos.map((p, idx) => (
                      <img key={idx} src={p.url} style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 6 }} />
                    ))}
                  </div>
                )}
                {vendorAction === 'reject' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Alasan Penolakan</label>
                    <textarea
                      className={styles.textarea}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      placeholder="Jelaskan alasan penolakan atau mismatch kondisi barang"
                    />
                  </div>
                )}
                <div className={styles.inspectionSummary}>
                  <div className={styles.summaryCardTitle}>Data input customer</div>
                  <div className={styles.summaryRow}>
                    <div><strong>Invoice / Deal:</strong> {inspecting.invoiceId || inspecting.dealId || '-'}</div>
                    <div><strong>Kondisi customer:</strong> {getConditionLabel(inspecting.itemCondition)}</div>
                    {String(inspecting.itemCondition || '').toLowerCase().includes('hilang') && (
                      <div><strong>Jumlah hilang:</strong> {inspecting.lostQuantity || 0}</div>
                    )}
                    <div><strong>Lokasi COD:</strong> {inspecting.codLocationDetail || inspecting.codLocation || '-'}</div>
                    <div style={{ gridColumn: '1 / -1' }}><strong>Deskripsi customer:</strong> {inspecting.damageDescription || '-'}</div>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Catatan</label>
                  <textarea className={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
                </div>
                <div className={styles.modalFooter}>
                  <button onClick={() => setInspecting(null)} className={`${styles.btn} ${styles.secondary}`}>Batal</button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.rejectButton}`}
                    onClick={() => {
                      if (vendorAction === 'reject' && rejectionReason.trim()) {
                        submitInspection('reject');
                      } else {
                        setVendorAction('reject');
                      }
                    }}
                  >
                    {vendorAction === 'reject' ? 'Submit Reject' : 'Reject'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.approveButton}`}
                    onClick={() => submitInspection('approve')}
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          )}
          {invoiceDetailOpen && invoicePreview && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3>Detail Invoice - {invoicePreview.invoiceId}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className={styles.small}><strong>Invoice ID:</strong> {invoicePreview.invoiceId}</div>
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
                  <button className={styles.btn} onClick={() => { setDealId(invoicePreview.dealId || invoicePreview.invoiceId); setInvoiceConfirmed(true); setInvoiceDetailOpen(false); }}>Gunakan invoice ini</button>
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
