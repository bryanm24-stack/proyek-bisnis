const fs = require('fs');
const path = require('path');

// Read files safely
const chatsBuffer = fs.readFileSync(path.join(__dirname, 'chats.json'));
const chats = JSON.parse(chatsBuffer.toString('utf-8'));

const usersBuffer = fs.readFileSync(path.join(__dirname, 'users.json'));
const users = JSON.parse(usersBuffer.toString('utf-8'));

console.log('\n🔍 VENDOR-TO-VENDOR CHAT ANALYSIS\n');

// Get all vendors
const vendors = users.filter(u => u.role === 'vendor');
console.log(`Found ${vendors.length} vendors:`);
vendors.forEach(v => console.log(`  - ID: ${v.id}, Name: ${v.vendorName || v.name}`));

console.log(`\nTotal chats: ${chats.length}`);

// Find vendor-to-vendor chats
const v2vChats = chats.filter(chat => {
  const isVendorAsProvider = vendors.some(v => String(v.id) === String(chat.vendorId));
  const isVendorAsCustomer = vendors.some(v => String(v.id) === String(chat.customerId));
  return isVendorAsProvider && isVendorAsCustomer;
});

console.log(`\nVendor-to-Vendor Chats: ${v2vChats.length}`);

if (v2vChats.length > 0) {
  v2vChats.forEach((chat, i) => {
    console.log(`\n[Chat ${i + 1}]`);
    console.log(`  Provider (vendorId): ${chat.vendorId} - ${chat.vendorName}`);
    console.log(`  Customer (customerId): ${chat.customerId} - ${chat.customerName}`);
    console.log(`  Service: ${chat.serviceTitle}`);
    console.log(`  Messages: ${chat.messages.length}`);
    
    // Check message attribution
    let errors = [];
    chat.messages.forEach((msg, idx) => {
      if (String(msg.senderId) !== String(chat.vendorId) && String(msg.senderId) !== String(chat.customerId)) {
        errors.push(`Message ${idx + 1}: Invalid senderId ${msg.senderId}`);
      }
    });
    
    if (errors.length === 0) {
      console.log(`   Message attribution: OK`);
    } else {
      errors.forEach(e => console.log(`  ❌ ${e}`));
    }
  });
} else {
  console.log('ℹ️  No vendor-to-vendor chats found (this is normal if vendors haven\'t chatted)');
}

// Test filtering logic
console.log('\n\n🧪 FILTER LOGIC TEST\n');
const testVendor = vendors[0];
if (testVendor) {
  console.log(`Testing vendor: ${testVendor.id} (${testVendor.name})\n`);
  
  const asVendor = chats.filter(c => String(c.vendorId) === String(testVendor.id));
  const asCustomer = chats.filter(c => String(c.customerId) === String(testVendor.id) && String(c.vendorId) !== String(testVendor.id));
  
  console.log(`As Vendor Provider: ${asVendor.length} chats`);
  console.log(`As Customer: ${asCustomer.length} chats`);
  console.log(`Total visibility: ${asVendor.length + asCustomer.length} chats `);
}

console.log('\n Analysis completed!\n');
