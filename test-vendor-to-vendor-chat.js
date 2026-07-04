const fs = require('fs');
const path = require('path');

console.log('\n🔍 === VENDOR-TO-VENDOR CHAT TEST ===\n');

// Read data files
const chatsPath = path.join(__dirname, 'chats.json');
const usersPath = path.join(__dirname, 'users.json');

try {
  const chatsBuffer = fs.readFileSync(chatsPath);
  const chatsData = chatsBuffer.toString('utf-8');
  const chats = JSON.parse(chatsData);
  
  const usersBuffer = fs.readFileSync(usersPath);
  const usersData = usersBuffer.toString('utf-8');
  const users = JSON.parse(usersData);
  
  // Get vendors only
  const vendors = users.filter(u => u.role === 'vendor');
  console.log(`📊 Found ${vendors.length} vendors:`);
  vendors.forEach(v => {
    console.log(`   - ${v.id}: ${v.vendorName || v.name}`);
  });
  
  console.log(`\n💬 Total chats: ${chats.length}`);
  
  // Check for vendor-to-vendor chats
  const vendorToVendorChats = chats.filter(chat => {
    const chatVendor = vendors.find(v => String(v.id) === String(chat.vendorId));
    const chatCustomer = vendors.find(v => String(v.id) === String(chat.customerId));
    return chatVendor && chatCustomer; // Both are vendors
  });
  
  console.log(`\n🎯 Vendor-to-Vendor Chats: ${vendorToVendorChats.length}`);
  
  if (vendorToVendorChats.length > 0) {
    console.log('\n📋 Details:');
    vendorToVendorChats.forEach((chat, idx) => {
      const vendor = vendors.find(v => String(v.id) === String(chat.vendorId));
      const customer = vendors.find(v => String(v.id) === String(chat.customerId));
      console.log(`\n  Chat ${idx + 1}:`);
      console.log(`    Service Provider (vendorId): ${vendor?.name} (ID: ${chat.vendorId})`);
      console.log(`    Customer (customerId): ${customer?.name} (ID: ${chat.customerId})`);
      console.log(`    Service: ${chat.serviceTitle}`);
      console.log(`    Messages: ${chat.messages.length}`);
      
      if (chat.messages.length > 0) {
        console.log(`    📧 Message Check:`);
        const senderIds = new Set(chat.messages.map(m => m.senderId));
        console.log(`       Unique senders: ${Array.from(senderIds).join(', ')}`);
        
        // Check for proper attribution
        let hasError = false;
        chat.messages.forEach((msg, midx) => {
          if (String(msg.senderId) !== String(chat.vendorId) && String(msg.senderId) !== String(chat.customerId)) {
            console.log(`       ❌ ERROR: Message ${midx + 1} has invalid senderId: ${msg.senderId}`);
            hasError = true;
          }
        });
        
        if (!hasError) {
          console.log(`       ✅ All message senders are valid`);
        }
      }
    });
  } else {
    console.log('\n⚠️  No vendor-to-vendor chats found yet.');
    console.log('\nℹ️  This is expected if vendors haven\'t chatted with each other.');
  }
  
  // Test filtering logic
  console.log('\n\n🧪 === FILTERING LOGIC TEST ===\n');
  
  if (vendors.length >= 2) {
    const testVendor = vendors[0];
    console.log(`Testing with vendor: ${testVendor.name} (ID: ${testVendor.id})\n`);
    
    const vendorChats = chats.filter(c => String(c.vendorId) === String(testVendor.id));
    const customerChats = chats.filter(c => String(c.customerId) === String(testVendor.id) && String(c.vendorId) !== String(testVendor.id));
    
    console.log(`  As Vendor Provider: ${vendorChats.length} chats`);
    vendorChats.forEach(c => {
      console.log(`    - Customer: ${c.customerName}`);
    });
    
    console.log(`\n  As Customer to other vendors: ${customerChats.length} chats`);
    customerChats.forEach(c => {
      console.log(`    - Vendor: ${c.vendorName}`);
    });
    
    console.log(`\n  Total visibility: ${vendorChats.length + customerChats.length} chats ✅`);
  }
  
  console.log('\n✅ Test completed successfully!\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
