// Debug script to test API response
const fs = require('fs');
const path = require('path');

// Simulate the GET /api/vendor/chats logic
const vendorId = '2'; // Banana Vendor

console.log(`\nTesting API logic for vendorId: "${vendorId}"\n`);

const chatsPath = path.join(__dirname, 'chats.json');
const chatsData = fs.readFileSync(chatsPath, 'utf-8');
const chats = JSON.parse(chatsData);

console.log(`Total chats in database: ${chats.length}`);

// API filter logic
const vendorChats = chats.filter(c => c.vendorId === vendorId || c.customerId === vendorId);

console.log(`\nAPI returns (vendorId === vendorId OR customerId === vendorId):`);
console.log(`Found ${vendorChats.length} chats`);

vendorChats.forEach((chat, idx) => {
  console.log(`\n  Chat ${idx}:`);
  console.log(`    Customer: ${chat.customerName}`);
  console.log(`    Service: ${chat.serviceTitle}`);
  console.log(`    Messages: ${chat.messages.length}`);
  console.log(`    VendorId: "${chat.vendorId}" | CustomerId: "${chat.customerId}"`);
});

console.log('\n\n=== COMPONENT FILTERING ===\n');

// After API returns, component does this:
console.log(`Component receives: ${vendorChats.length} chats`);
console.log(`Component then filters with: user?.id === "${vendorId}"`);

// First filter
const componentVendorChats = vendorChats.filter(c => c.vendorId === vendorId);
console.log(`\nFilter 1 (vendorId === user.id): ${componentVendorChats.length} chats`);
componentVendorChats.forEach(c => console.log(`  - ${c.customerName}`));

// Second filter  
const componentCustomerChats = vendorChats.filter(c => c.customerId === vendorId && c.vendorId !== vendorId);
console.log(`\nFilter 2 (customerId === user.id AND vendorId !== user.id): ${componentCustomerChats.length} chats`);
componentCustomerChats.forEach(c => console.log(`  - ${c.vendorName || '???'}`));

console.log('\n=== PROBLEM IDENTIFICATION ===\n');

if (componentVendorChats.length === 0 && componentCustomerChats.length === 0) {
  console.log('❌ ISSUE: Both filters return 0 chats!');
  console.log('   Possible causes:');
  console.log('   1. user?.id is undefined or different type');
  console.log('   2. API response is empty');
  console.log('   3. Filter comparison is failing');
} else {
  console.log(' Both filters work correctly');
  console.log(`   Vendor will see ${componentVendorChats.length} + ${componentCustomerChats.length} = ${componentVendorChats.length + componentCustomerChats.length} chats`);
}
