'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import SharedNavbar from '@/app/components/SharedNavbar';

const statusLabel = {
  PENDING_ADMIN: 'Menunggu Admin',
  FORWARDED_TO_VENDOR: 'Diteruskan ke Vendor',
  REFUND_PROCESSED: 'Diproses Vendor',
  RESOLVED: 'Selesai'
};

const statusColor = {
  PENDING_ADMIN: { bg: '#fff7ed', fg: '#9a3412' },
  FORWARDED_TO_VENDOR: { bg: '#eff6ff', fg: '#1d4ed8' },
  REFUND_PROCESSED: { bg: '#fef3c7', fg: '#92400e' },
  RESOLVED: { bg: '#dcfce7', fg: '#166534' }
};

function filterByScope(list, scope) {
  if (scope === 'active') return list.filter((item) => item.status !== 'RESOLVED');
  if (scope === 'resolved') return list.filter((item) => item.status === 'RESOLVED');
  return list;
}

function invoiceStatusTone(status) {
  if (status === 'paid') return { bg: '#dcfce7', fg: '#166534', label: 'Lunas' };
  if (status === 'pending') return { bg: '#fef3c7', fg: '#92400e', label: 'Menunggu Pembayaran' };
  return { bg: '#e2e8f0', fg: '#334155', label: status || 'Tidak diketahui' };
}

export default function TransactionHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mainTab, setMainTab] = useState('transactions');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [invoices, setInvoices] = useState([]);

  const [complaintRoleTab, setComplaintRoleTab] = useState('customer');
  const [complaintScope, setComplaintScope] = useState('all');
  const [customerHistory, setCustomerHistory] = useState([]);
  const [vendorHistory, setVendorHistory] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(raw);
    if (!['customer', 'member', 'vendor'].includes(parsed.role)) {
      router.push('/');
      return;
    }

    setUser(parsed);
    if (parsed.role === 'vendor') {
      setComplaintRoleTab('vendor');
    }
    loadAllData(parsed);
  }, [router]);

  useEffect(() => {
    const tabQuery = searchParams.get('tab');
    if (tabQuery === 'complaints') {
      setMainTab('complaints');
    }
  }, [searchParams]);

  async function loadAllData(currentUser) {
    setLoading(true);
    try {
      const invoiceParam = currentUser.role === 'vendor'
        ? `vendorId=${currentUser.id}`
        : `customerId=${currentUser.id}`;

      const [invoiceRes, asCustomerRes, asVendorRes] = await Promise.all([
        fetch(`/api/invoices?${invoiceParam}`),
        fetch(`/api/complaints?userId=${currentUser.id}&scope=all`),
        fetch(`/api/vendor/complaints?vendorId=${currentUser.id}&scope=all`)
      ]);

      const invoiceJson = await invoiceRes.json();
      const asCustomerJson = await asCustomerRes.json();
      const asVendorJson = await asVendorRes.json();

      const invoiceList = Array.isArray(invoiceJson)
        ? invoiceJson
        : (Array.isArray(invoiceJson?.data) ? invoiceJson.data : []);

      setInvoices(invoiceList);
      setCustomerHistory(Array.isArray(asCustomerJson?.data) ? asCustomerJson.data : []);
      setVendorHistory(Array.isArray(asVendorJson?.data) ? asVendorJson.data : []);
    } catch (error) {
      console.error('Error loading transaction history:', error);
      setInvoices([]);
      setCustomerHistory([]);
      setVendorHistory([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredInvoices = useMemo(() => {
    if (invoiceFilter === 'all') return invoices;
    return invoices.filter((item) => item.status === invoiceFilter);
  }, [invoiceFilter, invoices]);

  const visibleComplaints = useMemo(() => {
    const source = complaintRoleTab === 'customer' ? customerHistory : vendorHistory;
    return filterByScope(source, complaintScope);
  }, [complaintRoleTab, complaintScope, customerHistory, vendorHistory]);

  const complaintSummary = useMemo(() => ({
    customerAll: customerHistory.length,
    customerActive: customerHistory.filter((item) => item.status !== 'RESOLVED').length,
    customerResolved: customerHistory.filter((item) => item.status === 'RESOLVED').length,
    vendorAll: vendorHistory.length,
    vendorActive: vendorHistory.filter((item) => item.status !== 'RESOLVED').length,
    vendorResolved: vendorHistory.filter((item) => item.status === 'RESOLVED').length
  }), [customerHistory, vendorHistory]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat riwayat transaksi...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <SharedNavbar />
      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '30px', color: '#0f172a' }}>Riwayat Transaksi</h1>
        <p style={{ margin: '8px 0 18px', color: '#475569' }}>
          Semua histori transaksi ada di sini. Untuk histori complaint, pindah ke tab Riwayat Complaint.
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setMainTab('transactions')}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              background: mainTab === 'transactions' ? '#B28A67' : '#fff',
              color: mainTab === 'transactions' ? '#fff' : '#374151',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '13px'
            }}
          >
            Riwayat Transaksi
          </button>

          <button
            type="button"
            onClick={() => setMainTab('complaints')}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              background: mainTab === 'complaints' ? '#B28A67' : '#fff',
              color: mainTab === 'complaints' ? '#fff' : '#374151',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '13px'
            }}
          >
            Riwayat Complaint
          </button>
        </div>

        {mainTab === 'transactions' ? (
          <section>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {[
                ['all', 'Semua'],
                ['pending', 'Menunggu Pembayaran'],
                ['paid', 'Lunas']
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setInvoiceFilter(value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    background: invoiceFilter === value ? '#B28A67' : '#fff',
                    color: invoiceFilter === value ? '#fff' : '#374151',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '13px'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {filteredInvoices.length === 0 ? (
              <div style={{ padding: '24px', borderRadius: '14px', border: '1px dashed #cbd5e1', background: '#fff', color: '#64748b' }}>
                Tidak ada transaksi untuk filter yang dipilih.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                {filteredInvoices.map((invoice) => {
                  const tone = invoiceStatusTone(invoice.status);
                  return (
                    <article key={invoice.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '20px' }}>{invoice.serviceTitle || 'Transaksi Sewa'}</div>
                          <div style={{ marginTop: '4px', color: '#64748b', fontSize: '13px' }}>
                            Invoice: {invoice.id}
                          </div>
                        </div>
                        <span style={{ background: tone.bg, color: tone.fg, padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '800' }}>
                          {tone.label}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', fontSize: '14px', color: '#334155' }}>
                        <div>Deal: {invoice.dealId || '-'}</div>
                        <div>Transaksi: {invoice.transactionId || '-'}</div>
                        <div>Customer: {invoice.customerName || '-'}</div>
                        <div>Vendor: {invoice.vendorName || '-'}</div>
                        <div>Total: Rp {Number(invoice.totalAmount || 0).toLocaleString('id-ID')}</div>
                        <div>Dibuat: {invoice.createdAt ? new Date(invoice.createdAt).toLocaleString('id-ID') : '-'}</div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setComplaintRoleTab('customer')}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  background: complaintRoleTab === 'customer' ? '#fff7ed' : '#fff',
                  color: '#1f2937',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontWeight: '800', fontSize: '15px' }}>Riwayat Sebagai Customer</div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                  Total {complaintSummary.customerAll} • Aktif {complaintSummary.customerActive} • Selesai {complaintSummary.customerResolved}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setComplaintRoleTab('vendor')}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  background: complaintRoleTab === 'vendor' ? '#fff7ed' : '#fff',
                  color: '#1f2937',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontWeight: '800', fontSize: '15px' }}>Riwayat Sebagai Vendor</div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                  Total {complaintSummary.vendorAll} • Aktif {complaintSummary.vendorActive} • Selesai {complaintSummary.vendorResolved}
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {[
                ['all', 'Semua'],
                ['active', 'Aktif'],
                ['resolved', 'Selesai']
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setComplaintScope(value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    background: complaintScope === value ? '#B28A67' : '#fff',
                    color: complaintScope === value ? '#fff' : '#374151',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '13px'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {visibleComplaints.length === 0 ? (
              <div style={{ padding: '24px', borderRadius: '14px', border: '1px dashed #cbd5e1', background: '#fff', color: '#64748b' }}>
                Tidak ada complaint untuk filter yang dipilih.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                {visibleComplaints.map((item) => {
                  const tone = statusColor[item.status] || statusColor.PENDING_ADMIN;
                  return (
                    <article key={item.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '22px' }}>{item.type === 'pembatalan' ? 'Complaint Pembatalan' : 'Complaint Kerusakan'}</div>
                          <div style={{ marginTop: '4px', color: '#64748b', fontSize: '13px' }}>
                            Referensi: {item.invoiceId || item.dealId || item.transactionId}
                          </div>
                        </div>
                        <span style={{ background: tone.bg, color: tone.fg, padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '800' }}>
                          {statusLabel[item.status] || item.status}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', fontSize: '14px', color: '#334155', marginBottom: '10px' }}>
                        <div>Vendor: {item.vendorDisplayName || item.vendorName || '-'}</div>
                        <div>Customer: {item.customerName || '-'}</div>
                        <div>Layanan: {item.serviceTitle || '-'}</div>
                        <div>Total: Rp {Number(item.totalAmount || 0).toLocaleString('id-ID')}</div>
                        <div>Dibuat: {item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-'}</div>
                      </div>

                      <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', color: '#1f2937' }}>
                        {item.description || 'Tidak ada deskripsi tambahan.'}
                      </div>

                      {item.refundProofUrl && (
                        <div style={{ marginTop: '10px', padding: '12px', borderRadius: '10px', background: '#ecfdf5', color: '#166534' }}>
                          <div><strong>Refund sudah dibayar vendor</strong></div>
                          <div>Metode: {item.refundMethod || '-'}</div>
                          <div>Referensi: {item.refundReference || '-'}</div>
                          <div>Waktu bayar: {item.refundPaidAt ? new Date(item.refundPaidAt).toLocaleString('id-ID') : '-'}</div>
                          <a href={item.refundProofUrl} target="_blank" rel="noreferrer" style={{ color: '#166534', textDecoration: 'underline', fontWeight: '700' }}>
                            Lihat bukti refund
                          </a>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
