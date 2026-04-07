'use client';

import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      if (parsedUser.role !== 'vendor') {
        window.location.href = '/';
        return;
      }

      fetchVendorChats(parsedUser.id);
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
          vendorName: user.vendorName,
          customerId: selectedChat.customerId,
          customerName: selectedChat.customerName,
          message: newMessage
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

  if (!user || user.role !== 'vendor') {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Akses ditolak</div>;
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
        <Link href="/" style={{ fontSize: '24px', fontWeight: 'bold', color: '#5A45D1', textDecoration: 'none' }}>
          RentGuard
        </Link>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link href="/" style={{ color: '#5A45D1', textDecoration: 'none', fontWeight: '600' }}>
            🏠 Home
          </Link>
          <Link href="/vendor" style={{ color: '#5A45D1', textDecoration: 'none', fontWeight: '600' }}>
            Dashboard
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
            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>💬 Pesan Customer</h2>
            
            {loading ? (
              <p style={{ color: '#999', textAlign: 'center' }}>Memuat...</p>
            ) : chats.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center' }}>Belum ada pesan</p>
            ) : (
              chats.map((chat) => (
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
              ))
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
