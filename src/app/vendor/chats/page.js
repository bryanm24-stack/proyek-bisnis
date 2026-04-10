'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

export default function VendorChatsPage() {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [dealData, setDealData] = useState(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Fetch vendor chats - hanya fetch jika user adalah vendor
      if (parsedUser.role === 'vendor') {
        fetchVendorChats(parsedUser.id);
      } else {
        setLoading(false);
      }
    } else {
      window.location.href = '/login';
    }
  }, []);

  const fetchVendorChats = async (vendorId) => {
    try {
      const response = await fetch(`/api/vendor/chats?vendorId=${vendorId}`);
      const data = await response.json();
      if (data.success) {
        setChats(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
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
      const customerName = (chat.customerName || '').toLowerCase();
      const serviceTitle = (chat.serviceTitle || '').toLowerCase();
      return customerName.includes(searchLower) || serviceTitle.includes(searchLower);
    });
  }, [chats, searchQuery]);

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

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedChat.serviceId,
          serviceTitle: selectedChat.serviceTitle,
          vendorId: user.id,
          vendorName: user.vendorName || user.name,
          customerId: selectedChat.customerId,
          customerName: selectedChat.customerName,
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
    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          chatId: selectedChat.id,
          customerId: selectedChat.customerId,
          vendorId: user.id,
          serviceId: selectedChat.serviceId
        })
      });

      const data = await response.json();
      if (data.success) {
        setDealData(data.data.deal);
        setSelectedChat(data.data.chat);
        alert(data.message);
      }
    } catch (error) {
      console.error('Error processing deal:', error);
      alert('Gagal memproses deal');
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
      {/* Navbar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid #eee',
        background: 'white'
      }}>
        <Link href="/" style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed', textDecoration: 'none' }}>
          RentGuard
        </Link>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/" style={{ color: '#666', textDecoration: 'none', fontWeight: '500', fontSize: '14px', padding: '6px 12px', borderRadius: '6px', transition: 'all 0.3s' }}>
            🏠 Home
          </Link>
          <Link href="/vendor" style={{ color: '#666', textDecoration: 'none', fontWeight: '500', fontSize: '14px', padding: '6px 12px', borderRadius: '6px', transition: 'all 0.3s' }}>
            Dashboard
          </Link>
          <Link href="/vendor/chats" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: '600', fontSize: '14px', padding: '6px 12px', borderRadius: '6px', background: '#f0e6ff', transition: 'all 0.3s' }}>
            💬 Chat
          </Link>
          <Link href="/vendor/ongoing" style={{ color: '#666', textDecoration: 'none', fontWeight: '500', fontSize: '14px', padding: '6px 12px', borderRadius: '6px', transition: 'all 0.3s' }}>
            ⏳ Sedang Berlangsung
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              background: '#ec4899', 
              color: 'white', 
              padding: '6px 12px', 
              borderRadius: '50%', 
              fontWeight: 'bold',
              minWidth: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{user.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Vendor</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ display: 'flex', height: 'calc(100vh - 80px)' }}>
        {/* Chat List */}
        <div style={{
          width: '300px',
          borderRight: '1px solid #eee',
          overflowY: 'auto',
          background: '#f9fafb'
        }}>
          <div style={{ padding: '20px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>💬 Pesan Customer</h2>
            
            {/* Search Bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="🔍 Cari customer atau layanan..."
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
              <p style={{ color: '#999', textAlign: 'center' }}>Memuat pesan...</p>
            ) : chats.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', fontSize: '13px' }}>
                Belum ada pesan dari customer
              </p>
            ) : filteredChats.length === 0 ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#999', fontSize: '13px' }}>
                  ❌ Tidak ada hasil untuk "{searchQuery}"
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
                    background: selectedChat?.id === chat.id ? '#5A45D1' : '#fff',
                    color: selectedChat?.id === chat.id ? '#fff' : '#333',
                    border: selectedChat?.id === chat.id ? '2px solid #5A45D1' : '1px solid #eee',
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {chat.customerName}
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
                background: '#fff'
              }}>
                <h2 style={{ margin: 0, fontSize: '18px' }}>
                  {selectedChat.customerName} 👤
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                  {selectedChat.serviceTitle}
                </p>
              </div>

              {/* Deal Buttons */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => handleDealAction('accept')}
                  disabled={dealData?.status === 'agreed' || dealData?.status === 'cancelled'}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: dealData?.status === 'agreed' || dealData?.status === 'cancelled' ? '#d1d5db' : '#10b981',
                    color: 'white',
                    fontWeight: '600',
                    cursor: dealData?.status === 'agreed' || dealData?.status === 'cancelled' ? 'not-allowed' : 'pointer'
                  }}
                >
                  ✅ Terima Deal
                </button>
                <button
                  onClick={() => handleDealAction('cancel')}
                  disabled={dealData?.status === 'cancelled'}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: dealData?.status === 'cancelled' ? '#d1d5db' : '#ef4444',
                    color: 'white',
                    fontWeight: '600',
                    cursor: dealData?.status === 'cancelled' ? 'not-allowed' : 'pointer'
                  }}
                >
                  ❌ Tolak Deal
                </button>
                {dealData?.status === 'agreed' && (
                  <span style={{
                    padding: '8px 12px',
                    background: '#dbeafe',
                    color: '#0284c7',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    ✓ Deal Diterima
                  </span>
                )}
                {dealData?.status === 'cancelled' && (
                  <span style={{
                    padding: '8px 12px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    ✗ Deal Ditolak
                  </span>
                )}
              </div>

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
                    const isVendorMessage = msg.senderId === user?.id;
                    
                    return (
                      <div
                        key={msg.id}
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
                          background: isVendorMessage ? '#5A45D1' : '#e5e7eb',
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
                <input
                  type="text"
                  placeholder="Ketik pesan..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
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
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  onClick={sendMessage}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#5A45D1',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer'
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
    </div>
  );
}
