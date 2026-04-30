'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SharedNavbar from '../../components/SharedNavbar';

export default function CustomerChatsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [dealData, setDealData] = useState(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVendorModal, setShowVendorModal] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Fetch chats as customer - user yang adalah vendor juga bisa jadi customer saat chat dengan vendor lain
      fetchCustomerChats(parsedUser.id);
    } else {
      window.location.href = '/login';
    }
  }, []);

  const fetchCustomerChats = async (customerId) => {
    try {
      console.log('[customer/chats] Fetching chats for customerId:', customerId);
      const response = await fetch(`/api/customer/chats?customerId=${customerId}`);
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[customer/chats] API response:', data);
      
      if (data.success && data.data) {
        console.log('[customer/chats] Setting chats:', data.data.length, 'items');
        setChats(data.data);
      } else {
        console.error('[customer/chats] API returned success:false -', data.message);
        setChats([]); // Explicitly set empty
      }
    } catch (error) {
      console.error('[customer/chats] Error fetching chats:', error);
      setChats([]); // Explicitly set empty on error
    } finally {
      setLoading(false);
    }
  };

  // Filter chats berdasarkan search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) {
      return chats;
    }
    
    const searchLower = searchQuery.toLowerCase().trim();
    return chats.filter(chat => {
      const vendorName = (chat.vendorName || '').toLowerCase();
      const serviceTitle = (chat.serviceTitle || '').toLowerCase();
      return vendorName.includes(searchLower) || serviceTitle.includes(searchLower);
    });
  }, [chats, searchQuery]);

  // Debug logging
  useEffect(() => {
    console.log('[customer/chats] State:');
    console.log('  - user.id:', user?.id, '(type:', typeof user?.id, ')');
    console.log('  - total chats:', chats.length);
    console.log('  - filtered chats:', filteredChats.length);
    if (chats.length > 0) {
      console.log('  - chats:', chats.map(c => `${c.vendorName} - ${c.serviceTitle}`));
    }
  }, [chats, filteredChats, user]);

  const openChat = async (chat) => {
    setSelectedChat(chat);
    setMessages(chat.messages || []);
    setNewMessage('');
    
    try {
      const dealResponse = await fetch(`/api/deals?chatId=${chat.id}`);
      const dealDataResp = await dealResponse.json();
      if (dealDataResp.success && dealDataResp.data) {
        setDealData(dealDataResp.data);
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

  const proceedToPayment = () => {
    if (!dealData?.id) {
      alert('Deal belum siap untuk pembayaran.');
      return;
    }
    router.push(`/transaction/payment?dealId=${dealData.id}`);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (selectedChat?.dealStatus === 'closed') {
      alert('Chat sudah ditutup setelah pembayaran selesai.');
      return;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedChat.serviceId,
          serviceTitle: selectedChat.serviceTitle,
          vendorId: selectedChat.vendorId,
          vendorName: selectedChat.vendorName,
          customerId: user.id,
          customerName: user.name,
          message: newMessage,
          senderId: user.id,
          senderName: user.name
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

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat...</div>;
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
          background: '#f9fafb'
        }}>
          <div style={{ padding: '20px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>💬 Chat Vendor</h2>
            
            {/* Search Bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="🔍 Cari vendor atau layanan..."
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
                    e.target.style.borderColor = '#7c3aed';
                    e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
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
              {searchQuery && !loading && (
                <div style={{ fontSize: '11px', color: '#999', marginTop: '6px', paddingLeft: '4px' }}>
                  {filteredChats.length} hasil ditemukan
                </div>
              )}
            </div>
            
            {loading ? (
              <p style={{ color: '#999', textAlign: 'center' }}>Memuat chats...</p>
            ) : chats.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', fontSize: '13px' }}>
                Belum ada chat dengan vendor
              </p>
            ) : filteredChats.length === 0 ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#999', fontSize: '13px' }}>
                  ❌ Tidak ada hasil untuk &quot;{searchQuery}&quot;
                </p>
                <p style={{ color: '#bbb', fontSize: '12px', marginTop: '8px' }}>
                  Coba kata kunci lain
                </p>
              </div>
            ) : (
              <div>
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => openChat(chat)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: selectedChat?.id === chat.id ? '#7c3aed' : '#fff',
                      color: selectedChat?.id === chat.id ? '#fff' : '#333',
                      border: selectedChat?.id === chat.id ? '2px solid #7c3aed' : '1px solid #eee',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                      {chat.vendorName}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                      {chat.serviceTitle}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
                      {chat.messages?.length || 0} pesan
                    </div>
                  </div>
                ))}
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
                      color: '#7c3aed',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setShowVendorModal(true)}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    {user.id === selectedChat.customerId ? selectedChat.vendorName : selectedChat.customerName} 🏪
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                    {selectedChat.serviceTitle}
                  </p>
                </div>
                <button
                  onClick={() => setShowVendorModal(true)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#7c3aed',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  👤 Profil
                </button>
              </div>

              {/* Show pricing and discount info when deal agreed */}
              {dealData?.status === 'agreed' && (
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#666' }}>Deal telah disetujui</div>
                    <div style={{ fontWeight: 800, fontSize: '16px', marginTop: '4px' }}>
                      Harga akhir: Rp {(dealData.finalPrice || dealData.originalPrice || 0).toLocaleString('id-ID')}
                    </div>
                    {dealData.discountGiven && dealData.discount && (
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                        Potongan: Rp {dealData.discount.amount.toLocaleString('id-ID')} ({dealData.discount.type === 'percent' ? `${dealData.discount.value}%` : `Rp ${dealData.discount.value.toLocaleString('id-ID')}`})
                      </div>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={proceedToPayment}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#7c3aed', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Lanjut ke Pembayaran
                    </button>
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
                  messages.map((msg) => {
                    const isCustomerMessage = msg.senderId === user?.id;
                    
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: isCustomerMessage ? 'flex-end' : 'flex-start',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{
                          maxWidth: '65%',
                          padding: '12px 14px',
                          borderRadius: '16px',
                          background: isCustomerMessage ? '#7c3aed' : '#e5e7eb',
                          color: isCustomerMessage ? 'white' : '#333',
                          wordWrap: 'break-word'
                        }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            marginBottom: '4px',
                            opacity: 0.8
                          }}>
                            {isCustomerMessage ? 'Anda' : `${msg.senderName}`}
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
                            opacity: isCustomerMessage ? 0.8 : 0.6,
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
                    background: '#7c3aed',
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

      {/* Vendor Profile Modal */}
      {showVendorModal && selectedChat && (
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
              onClick={() => setShowVendorModal(false)}
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

            {/* Vendor Info */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
                {selectedChat.vendorName}
              </h2>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                {selectedChat.serviceTitle}
              </p>
            </div>

            {/* Status Deal */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {!dealData && (
                <div style={{
                  padding: '12px',
                  background: '#f3f4f6',
                  color: '#4b5563',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  Belum ada status deal. Lanjutkan negosiasi lewat chat.
                </div>
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
                  Menunggu konfirmasi vendor.
                </div>
              )}

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
                    ✓ Deal sudah disetujui.
                  </div>
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#f5f3ff',
                    color: '#5b21b6',
                    fontSize: '12px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    Gunakan tombol ungu Lanjut ke Pembayaran di area chat untuk melanjutkan pembayaran.
                  </div>
                </>
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
                  Deal dibatalkan.
                </div>
              )}
            </div>

            {/* Close Modal Button */}
            <button
              onClick={() => setShowVendorModal(false)}
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
