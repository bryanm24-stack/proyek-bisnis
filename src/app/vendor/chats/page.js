'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SharedNavbar from '../../components/SharedNavbar';

export default function VendorChatsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [dealData, setDealData] = useState(null);
  const [dealProcessing, setDealProcessing] = useState(false);
  const [discountMode, setDiscountMode] = useState(null); // null | 'prompt' | 'yes' | 'no'
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState('10');
  const [discountPreview, setDiscountPreview] = useState(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [chatTab, setChatTab] = useState('vendor'); // 'vendor' | 'customer'

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Fetch vendor chats untuk semua role
      fetchVendorChats(parsedUser.id);
    } else {
      window.location.href = '/login';
    }
  }, []);

  const fetchVendorChats = async (vendorId) => {
    try {
      console.log('[vendor/chats] Fetching chats for vendorId:', vendorId);
      const response = await fetch(`/api/vendor/chats?vendorId=${vendorId}`);
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[vendor/chats] API response:', data);
      
      if (data.success && data.data) {
        console.log('[vendor/chats] Setting chats:', data.data.length, 'items');
        setChats(data.data);
      } else {
        console.error('[vendor/chats] API returned success:false -', data.message);
        setChats([]); // Explicitly set empty
      }
    } catch (error) {
      console.error('[vendor/chats] Error fetching chats:', error);
      setChats([]); // Explicitly set empty on error
    } finally {
      setLoading(false);
    }
  };

  // Kategorisasi chats
  const vendorChats = chats.filter(c => String(c.vendorId) === String(user?.id)); // Dia sebagai vendor
  const customerChats = chats.filter(c => String(c.customerId) === String(user?.id) && String(c.vendorId) !== String(user?.id)); // Dia sebagai customer ke vendor lain

  // Debug logging
  useEffect(() => {
    console.log('[vendor/chats] Filter results:');
    console.log('  - user.id:', user?.id, '(type:', typeof user?.id, ')');
    console.log('  - total chats:', chats.length);
    console.log('  - vendorChats:', vendorChats.length, vendorChats.map(c => c.customerName));
    console.log('  - customerChats:', customerChats.length, customerChats.map(c => c.vendorName));
  }, [vendorChats, customerChats, user, chats.length]);

  // Filter chats berdasarkan search query
  const filteredVendorChats = useMemo(() => {
    if (!searchQuery.trim()) {
      return vendorChats;
    }
    
    const searchLower = searchQuery.toLowerCase().trim();
    return vendorChats.filter(chat => {
      const customerName = (chat.customerName || '').toLowerCase();
      const serviceTitle = (chat.serviceTitle || '').toLowerCase();
      const itemName = (chat.itemName || '').toLowerCase();
      return customerName.includes(searchLower) || serviceTitle.includes(searchLower) || itemName.includes(searchLower);
    });
  }, [vendorChats, searchQuery]);

  const filteredCustomerChats = useMemo(() => {
    if (!searchQuery.trim()) {
      return customerChats;
    }
    
    const searchLower = searchQuery.toLowerCase().trim();
    return customerChats.filter(chat => {
      const vendorName = (chat.vendorName || '').toLowerCase();
      const serviceTitle = (chat.serviceTitle || '').toLowerCase();
      const itemName = (chat.itemName || '').toLowerCase();
      return vendorName.includes(searchLower) || serviceTitle.includes(searchLower) || itemName.includes(searchLower);
    });
  }, [customerChats, searchQuery]);

  const openChat = async (chat) => {
    setSelectedChat(chat);
    setMessages(chat.messages || []);
    setNewMessage('');
    
    try {
      const dealResponse = await fetch(`/api/deals?chatId=${chat.id}`);
      const dealDataResp = await dealResponse.json();
      if (dealDataResp.success && dealDataResp.data) {
        setDealData(dealDataResp.data);
        // reset discount ui state
        setDiscountMode(null);
        setDiscountType('percent');
        setDiscountValue('10');
        setDiscountPreview(null);
      }
    } catch (error) {
      console.error('Error loading deal:', error);
    }

    setChatModalOpen(true);
  };

  const closeChat = () => {
    setChatModalOpen(false);
    setSelectedChat(null);
    setMessages([]);
    setDealData(null);
  };

  const getChatTopicLabel = (chat) => {
    if (!chat) return '';
    if (chat.itemName) {
      return `${chat.serviceTitle} • ${chat.itemName}`;
    }

    return chat.serviceTitle || '';
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (selectedChat?.dealStatus === 'closed') {
      alert('Chat sudah ditutup setelah pembayaran selesai.');
      return;
    }

    const vendorId = selectedChat.vendorId;
    const customerId = selectedChat.customerId;
    const vendorName = selectedChat.vendorName;
    const customerName = selectedChat.customerName;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedChat.serviceId,
          serviceTitle: selectedChat.serviceTitle,
          itemId: selectedChat.itemId || null,
          itemName: selectedChat.itemName || null,
          vendorId,
          vendorName,
          customerId,
          customerName,
          message: newMessage,
          senderId: user.id,
          senderName: user.vendorName || user.name
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(data.data.messages || []);
        setNewMessage('');
        
        // Update chats list
        setChats(chats.map(c => 
          c.id === selectedChat.id ? data.data : c
        ));
        setSelectedChat(data.data);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Gagal mengirim pesan');
    }
  };

  const handleDealAction = async (action) => {
    if (dealProcessing) return;
    if (!selectedChat) return;

    if (String(user?.id) !== String(selectedChat.vendorId)) {
      alert('Hanya vendor pemilik chat yang bisa menerima atau menolak deal.');
      return;
    }

    setDealProcessing(true);
    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          chatId: selectedChat.id,
          customerId: selectedChat.customerId,
          vendorId: selectedChat.vendorId,
          serviceId: selectedChat.serviceId
        })
      });

      const data = await response.json();
      if (data.success) {
        setDealData(data.data.deal);
        setSelectedChat(data.data.chat);
        alert(data.message);
        // if vendor accepted, prompt for discount choice
        if (action === 'accept' && data.data.deal?.status === 'agreed') {
          setDiscountMode('prompt');
        }
      }
    } catch (error) {
      console.error('Error processing deal:', error);
      alert('Gagal memproses deal');
    } finally {
      setDealProcessing(false);
    }
  };

  const handleCustomerDealRequest = async () => {
    if (!selectedChat) return;

    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          chatId: selectedChat.id,
          customerId: selectedChat.customerId,
          vendorId: selectedChat.vendorId,
          serviceId: selectedChat.serviceId
        })
      });

      const data = await response.json();
      if (data.success) {
        setDealData(data.data.deal);
        setSelectedChat(data.data.chat);
        alert(data.message || 'Penawaran deal berhasil dikirim.');
      } else {
        alert(data.message || 'Gagal mengirim penawaran deal.');
      }
    } catch (error) {
      console.error('Error requesting deal:', error);
      alert('Gagal mengirim penawaran deal');
    }
  };

  useEffect(() => {
    const original = dealData?.originalPrice ?? null;
    if (original == null) {
      setDiscountPreview(null);
      return;
    }
    const val = Number(discountValue) || 0;
    let amount = 0;
    if (discountType === 'percent') {
      amount = Math.round((val / 100) * original);
    } else {
      amount = Number(val) || 0;
    }
    if (amount < 0) amount = 0;
    let finalP = original - amount;
    if (finalP < 0) finalP = 0;
    setDiscountPreview({ amount, finalPrice: finalP, original });
  }, [discountType, discountValue, dealData]);

  const applyDiscount = async () => {
    if (!dealData || !selectedChat) return;
    try {
      const body = {
        action: 'apply-discount',
        chatId: selectedChat.id,
        vendorId: user.id,
        discountType,
        discountValue: Number(discountValue)
      };

      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.success) {
        setDealData(data.data.deal);
        if (data.data.chat) {
          setSelectedChat(data.data.chat);
          setChats((prev) => prev.map((c) => (c.id === data.data.chat.id ? data.data.chat : c)));
        }
        setDiscountMode(null);
        alert('Diskon berhasil diterapkan');
      } else {
        alert(data.message || 'Gagal menerapkan diskon');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menerapkan diskon: ' + err.message);
    }
  };

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (user.role !== 'vendor') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>❌ Anda bukan vendor. Hanya vendor yang bisa mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div>
      <SharedNavbar />

      {/* Main Content */}
      <div style={{ display: 'flex', height: 'calc(100vh - 70px)' }}>
        {/* Chat List */}
        <div style={{
          width: '300px',
          borderRight: '1px solid #eee',
          overflowY: 'auto',
          background: '#f9fafb',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '20px', paddingBottom: '0' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>💬 Chat</h2>
            
            {/* Tab Navigation */}
            {vendorChats.length > 0 || customerChats.length > 0 ? (
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '2px solid #e5e7eb'
              }}>
                <button
                  onClick={() => setChatTab('vendor')}
                  disabled={vendorChats.length === 0}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: chatTab === 'vendor' ? '700' : '500',
                    color: chatTab === 'vendor' ? '#B28A67' : '#999',
                    cursor: vendorChats.length === 0 ? 'not-allowed' : 'pointer',
                    borderBottom: chatTab === 'vendor' ? '2px solid #B28A67' : 'none',
                    transition: 'all 0.2s',
                    opacity: vendorChats.length === 0 ? 0.5 : 1,
                    marginBottom: '-2px'
                  }}
                >
                  🏪 Penjualan {vendorChats.length > 0 && `(${vendorChats.length})`}
                </button>
                <button
                  onClick={() => setChatTab('customer')}
                  disabled={customerChats.length === 0}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: chatTab === 'customer' ? '700' : '500',
                    color: chatTab === 'customer' ? '#B28A67' : '#999',
                    cursor: customerChats.length === 0 ? 'not-allowed' : 'pointer',
                    borderBottom: chatTab === 'customer' ? '2px solid #B28A67' : 'none',
                    transition: 'all 0.2s',
                    opacity: customerChats.length === 0 ? 0.5 : 1,
                    marginBottom: '-2px'
                  }}
                >
                  👤 Pembelian {customerChats.length > 0 && `(${customerChats.length})`}
                </button>
              </div>
            ) : null}
          </div>

          {/* Chat List Content */}
          <div style={{ padding: '0 20px 20px 20px', flex: 1, overflowY: 'auto' }}>
            {/* Search Bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder={chatTab === 'vendor' ? "🔍 Cari vendor..." : "🔍 Cari customer..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    paddingRight: searchQuery ? '35px' : '12px',
                    borderRadius: '8px',
                    border: '2px solid #eee',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s',
                    outline: 'none',
                    backgroundColor: '#fff'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#B28A67';
                    e.target.style.boxShadow = '0 0 0 3px rgba(178, 138, 103, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#eee';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      fontSize: '16px',
                      cursor: 'pointer',
                      color: '#999',
                      padding: '0',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <p style={{ color: '#999', textAlign: 'center' }}>Memuat pesan...</p>
            ) : (
              <div>
                {/* VENDOR TAB - Chat saat user berperan sebagai vendor */}
                {chatTab === 'vendor' ? (
                  vendorChats.length === 0 ? (
                    <p style={{ color: '#999', textAlign: 'center', fontSize: '13px', marginTop: '20px' }}>
                      Belum ada chat dengan customer
                    </p>
                  ) : (
                    <>
                      {filteredVendorChats.length === 0 && searchQuery ? (
                        <p style={{ fontSize: '12px', color: '#999', padding: '8px', textAlign: 'center' }}>
                          Tidak ada hasil
                        </p>
                      ) : (
                        filteredVendorChats.map((chat, index) => (
                          <div
                            key={`${chat.id || chat.createdAt}-${index}`}
                            onClick={() => openChat(chat)}
                            style={{
                              padding: '12px',
                              marginBottom: '8px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: selectedChat?.id === chat.id ? '#B28A67' : '#fff',
                              color: selectedChat?.id === chat.id ? '#fff' : '#333',
                              border: selectedChat?.id === chat.id ? '2px solid #B28A67' : '1px solid #eee',
                              transition: 'all 0.3s'
                            }}
                          >
                            <div style={{ fontWeight: '600', fontSize: '14px' }}>
                              {chat.customerName}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                              {getChatTopicLabel(chat)}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
                              {chat.messages?.length || 0} pesan
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )
                ) : (
                  /* CUSTOMER TAB - Chat saat user berperan sebagai customer */
                  customerChats.length === 0 ? (
                    <p style={{ color: '#999', textAlign: 'center', fontSize: '13px', marginTop: '20px' }}>
                      Belum ada chat dengan vendor
                    </p>
                  ) : (
                    <>
                      {filteredCustomerChats.length === 0 && searchQuery ? (
                        <p style={{ fontSize: '12px', color: '#999', padding: '8px', textAlign: 'center' }}>
                          Tidak ada hasil
                        </p>
                      ) : (
                        filteredCustomerChats.map((chat, index) => (
                          <div
                            key={`${chat.id || chat.createdAt}-${index}`}
                            onClick={() => openChat(chat)}
                            style={{
                              padding: '12px',
                              marginBottom: '8px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: selectedChat?.id === chat.id ? '#B28A67' : '#fff',
                              color: selectedChat?.id === chat.id ? '#fff' : '#333',
                              border: selectedChat?.id === chat.id ? '2px solid #B28A67' : '1px solid #eee',
                              transition: 'all 0.3s'
                            }}
                          >
                            <div style={{ fontWeight: '600', fontSize: '14px' }}>
                              {chat.vendorName}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                              {getChatTopicLabel(chat)}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
                              {chat.messages?.length || 0} pesan
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {chatModalOpen && selectedChat ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Header */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #eee',
                background: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h2 
                    style={{ 
                      margin: 0, 
                      fontSize: '18px',
                      cursor: 'pointer',
                      color: '#B28A67',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setShowCustomerModal(true)}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    {String(user.id) === String(selectedChat.vendorId) ? selectedChat.customerName : selectedChat.vendorName}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                    {getChatTopicLabel(selectedChat)}
                  </p>
                </div>
                <button
                  onClick={() => setShowCustomerModal(true)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#B28A67',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  👤 Profil
                </button>
              </div>

              {/* Quick info and actions, visible without opening profile modal */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px', background: '#f8fafc' }}>
                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                      Profil lawan chat
                    </div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>
                      {String(user.id) === String(selectedChat.vendorId) ? selectedChat.customerName : selectedChat.vendorName}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
                      Topik: {getChatTopicLabel(selectedChat)}
                    </div>

                    {String(user?.id) === String(selectedChat.vendorId) && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleDealAction('accept')}
                          disabled={dealProcessing || dealData?.status !== 'pending'}
                          style={{ padding: '8px 10px', border: 'none', borderRadius: '8px', background: dealProcessing || dealData?.status !== 'pending' ? '#94d3a2' : '#10b981', color: 'white', fontWeight: '700', cursor: dealProcessing || dealData?.status !== 'pending' ? 'not-allowed' : 'pointer', opacity: dealProcessing || dealData?.status !== 'pending' ? 0.6 : 1 }}
                        >
                          {dealProcessing ? 'Memproses...' : '✅ Terima Deal'}
                        </button>
                        <button
                          onClick={() => handleDealAction('cancel')}
                          disabled={!dealData || dealData?.status === 'cancelled' || dealData?.status === 'completed'}
                          style={{ padding: '8px 10px', border: 'none', borderRadius: '8px', background: !dealData || dealData?.status === 'cancelled' || dealData?.status === 'completed' ? '#fca5a5' : '#ef4444', color: 'white', fontWeight: '700', cursor: !dealData || dealData?.status === 'cancelled' || dealData?.status === 'completed' ? 'not-allowed' : 'pointer', opacity: !dealData || dealData?.status === 'cancelled' || dealData?.status === 'completed' ? 0.6 : 1 }}
                        >
                          ❌ Tolak
                        </button>
                        {dealData?.status === 'agreed' && (
                          <button
                            onClick={() => setDiscountMode('yes')}
                            style={{ padding: '8px 10px', border: 'none', borderRadius: '8px', background: '#f59e0b', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                          >
                            💰 Kasih Promo
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Discount prompt modal (small) */}
              {discountMode === 'prompt' && (
                <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
                  <div style={{ background: 'rgba(0,0,0,0.35)', position: 'absolute', inset: 0 }} onClick={() => setDiscountMode(null)} />
                  <div style={{ position: 'relative', background: 'white', padding: '18px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', width: '420px', maxWidth: '92%', textAlign: 'left', zIndex: 90 }}>
                    <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '6px' }}>Berikan diskon untuk pesanan ini?</div>
                    <div style={{ color: '#666', fontSize: '13px', marginBottom: '12px' }}>Pilih &quot;Ya&quot; untuk menetapkan potongan harga sekarang atau &quot;Tidak&quot; untuk melewati.</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => setDiscountMode(null)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', background: 'white' }}>Tidak</button>
                      <button onClick={() => setDiscountMode('yes')} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#B28A67', color: 'white', fontWeight: 700 }}>Ya, beri diskon</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Discount editor modal (centered) */}
              {discountMode === 'yes' && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
                  <div style={{ width: '520px', maxWidth: '92%', background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', transform: 'translateY(0)', transition: 'all 220ms ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '16px' }}>Preview Diskon</div>
                        <div style={{ fontSize: '13px', color: '#666' }}>Periksa sebelum menyimpan harga akhir</div>
                      </div>
                      <button onClick={() => setDiscountMode(null)} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                      <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                        <option value="percent">Persen (%)</option>
                        <option value="amount">Jumlah (Rp)</option>
                      </select>
                      <input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #eee', width: '160px' }} />
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        {discountPreview ? (
                          <>
                            <div style={{ fontSize: '12px', color: '#888' }}>Harga asli</div>
                            <div style={{ fontWeight: 800, fontSize: '18px' }}>Rp {discountPreview.original.toLocaleString('id-ID')}</div>
                          </>
                        ) : (
                          <div style={{ color: '#999' }}>Harga tidak tersedia</div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#666' }}>Potongan</div>
                        <div style={{ fontWeight: 700, fontSize: '16px' }}>{discountPreview ? `Rp ${discountPreview.amount.toLocaleString('id-ID')}` : '-'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', color: '#666' }}>Harga akhir</div>
                        <div style={{ fontWeight: 900, fontSize: '18px', color: '#111' }}>{discountPreview ? `Rp ${discountPreview.finalPrice.toLocaleString('id-ID')}` : '-'} </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setDiscountMode(null)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', background: 'white' }}>Batal</button>
                      <button onClick={async () => { await applyDiscount(); }} style={{ padding: '10px 14px', borderRadius: '8px', border: 'none', background: '#B28A67', color: 'white', fontWeight: 800 }}>Simpan Harga</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                background: '#f9fafb',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {messages.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#999'
                  }}>
                    Mulai percakapan
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isVendorMessage = msg.senderId === user?.id;
                    
                    return (
                      <div
                        key={`${msg.id || msg.timestamp}-${index}`}
                        style={{
                          display: 'flex',
                          justifyContent: isVendorMessage ? 'flex-end' : 'flex-start',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{
                          maxWidth: '65%',
                          padding: '12px 14px',
                          borderRadius: '16px',
                          background: isVendorMessage ? '#B28A67' : '#e5e7eb',
                          color: isVendorMessage ? 'white' : '#333',
                          wordWrap: 'break-word'
                        }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            marginBottom: '4px',
                            opacity: 0.8
                          }}>
                            {isVendorMessage ? 'Anda (Vendor)' : `${msg.senderName}`}
                          </div>
                          <p style={{ 
                            margin: '0 0 4px 0', 
                            fontSize: '14px', 
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            lineHeight: '1.4'
                          }}>
                            {msg.message}
                          </p>
                          <span style={{
                            fontSize: '11px',
                            opacity: isVendorMessage ? 0.8 : 0.6,
                            display: 'block',
                            marginTop: '4px'
                          }}>
                            {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input */}
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid #eee',
                background: 'white',
                display: 'flex',
                gap: '10px'
              }}>
                {selectedChat?.dealStatus === 'closed' && (
                  <div style={{ marginBottom: '10px', padding: '10px 12px', borderRadius: '8px', background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', fontSize: '13px', width: '100%' }}>
                    Chat sudah ditutup setelah pembayaran selesai.
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Ketik pesan..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={selectedChat?.dealStatus === 'closed'}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      sendMessage();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    opacity: selectedChat?.dealStatus === 'closed' ? 0.6 : 1,
                    cursor: selectedChat?.dealStatus === 'closed' ? 'not-allowed' : 'text'
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={selectedChat?.dealStatus === 'closed'}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#B28A67',
                    color: 'white',
                    fontWeight: '600',
                    cursor: selectedChat?.dealStatus === 'closed' ? 'not-allowed' : 'pointer',
                    opacity: selectedChat?.dealStatus === 'closed' ? 0.6 : 1
                  }}
                >
                  Kirim
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontSize: '16px'
            }}>
              Pilih chat untuk memulai percakapan
            </div>
          )}
        </div>
      </div>

      {/* Customer/Vendor Profile Modal */}
      {showCustomerModal && selectedChat && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowCustomerModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#999'
              }}
            >
              ✕
            </button>

            {/* Profile Info */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
                {String(user?.id) === String(selectedChat.customerId) ? selectedChat.vendorName : selectedChat.customerName}
              </h2>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                {getChatTopicLabel(selectedChat)}
              </p>
            </div>

              {/* Deal Buttons - hanya vendor pemilik chat yang boleh accept/reject */}
              {String(user?.id) === String(selectedChat.vendorId) && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <button
                  onClick={() => {
                    handleDealAction('accept');
                    setShowCustomerModal(false);
                  }}
                  disabled={dealProcessing || dealData?.status !== 'pending'}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: dealProcessing || dealData?.status !== 'pending' ? '#d1d5db' : '#10b981',
                    color: 'white',
                    fontWeight: '600',
                    cursor: dealProcessing || dealData?.status !== 'pending' ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {dealProcessing ? 'Memproses...' : '✅ Terima Deal'}
                </button>
                <button
                  onClick={() => {
                    handleDealAction('cancel');
                    setShowCustomerModal(false);
                  }}
                  disabled={!dealData || dealData?.status === 'cancelled' || dealData?.status === 'completed'}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: !dealData || dealData?.status === 'cancelled' || dealData?.status === 'completed' ? '#d1d5db' : '#ef4444',
                    color: 'white',
                    fontWeight: '600',
                    cursor: !dealData || dealData?.status === 'cancelled' || dealData?.status === 'completed' ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ❌ Tolak Deal
                </button>

                {dealData?.status === 'agreed' && (
                  <>
                    <div style={{
                      padding: '12px',
                      background: '#dbeafe',
                      color: '#0284c7',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      ✓ Deal Diterima
                    </div>
                    {user.id === selectedChat.vendorId && discountMode !== 'yes' && discountMode !== 'prompt' && (
                      <button
                        onClick={() => setDiscountMode('yes')}
                        style={{
                          padding: '12px 16px',
                          border: 'none',
                          borderRadius: '8px',
                          background: '#f59e0b',
                          color: 'white',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#d97706'}
                        onMouseLeave={(e) => e.target.style.background = '#f59e0b'}
                      >
                        💰 Aplikasikan Diskon
                      </button>
                    )}
                  </>
                )}

                {selectedChat?.dealStatus === 'closed' && (
                  <div style={{
                    padding: '12px',
                    background: '#ecfdf5',
                    color: '#065f46',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    Pembayaran sudah selesai dan chat telah ditutup.
                  </div>
                )}

                {dealData?.status === 'cancelled' && (
                  <div style={{
                    padding: '12px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    ✗ Deal Ditolak
                  </div>
                )}
              </div>
            )}

            {/* Customer action - lanjut pembayaran hanya setelah vendor accept */}
            {String(user?.id) === String(selectedChat.customerId) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {dealData?.status === 'agreed' && dealData?.vendorAccepted && !selectedChat?.closedAt && selectedChat?.dealStatus !== 'closed' && (
                  <button
                    onClick={() => {
                      if (selectedChat?.dealStatus === 'closed' || selectedChat?.closedAt || dealData?.status === 'completed') {
                        alert('Pembayaran sudah selesai. Chat ini sudah ditutup.');
                        return;
                      }
                      if (!dealData?.id) {
                        alert('Deal belum siap untuk pembayaran.');
                        return;
                      }
                      router.push(`/transaction/payment?dealId=${dealData.id}`);
                    }}
                    disabled={selectedChat?.dealStatus === 'closed' || selectedChat?.closedAt || dealData?.status === 'completed'}
                    style={{
                      padding: '12px 16px',
                      border: 'none',
                      borderRadius: '8px',
                      background: selectedChat?.dealStatus === 'closed' || selectedChat?.closedAt || dealData?.status === 'completed' ? '#9ca3af' : '#B28A67',
                      color: 'white',
                      fontWeight: '600',
                      cursor: selectedChat?.dealStatus === 'closed' || selectedChat?.closedAt || dealData?.status === 'completed' ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    💳 Lanjut ke Pembayaran
                  </button>
                )}

                {(!dealData || dealData?.status === 'cancelled' || dealData?.status === 'completed') && (
                  <button
                    onClick={handleCustomerDealRequest}
                    style={{
                      padding: '12px 16px',
                      border: 'none',
                      borderRadius: '8px',
                      background: '#5b21b6',
                      color: 'white',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    📝 Ajukan Deal Ulang
                  </button>
                )}

                {dealData?.status === 'pending' && (
                  <div style={{
                    padding: '12px',
                    background: '#fff7ed',
                    color: '#c2410c',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    Menunggu vendor menerima deal sebelum lanjut pembayaran.
                  </div>
                )}

                {dealData?.status === 'cancelled' && (
                  <div style={{
                    padding: '12px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    Deal ditolak vendor. Lakukan negosiasi ulang dulu.
                  </div>
                )}

                {(selectedChat?.dealStatus === 'closed' || selectedChat?.closedAt) && (
                  <div style={{
                    padding: '12px',
                    background: '#ecfdf5',
                    color: '#065f46',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    Pembayaran sudah selesai dan chat telah ditutup.
                  </div>
                )}
              </div>
            )}

            {/* Close Modal Button */}
            <button
              onClick={() => setShowCustomerModal(false)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                color: '#333',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
