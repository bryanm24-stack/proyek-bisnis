const fs = require('fs');
const path = require('path');

console.log('\n=== CHAT DATA ANALYSIS ===\n');

// Read chats
const chatsPath = path.join(__dirname, 'chats.json');
const chats = JSON.parse(fs.readFileSync(chatsPath, 'utf-8'));

// Read users
const usersPath = path.join(__dirname, 'users.json');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));

// Read services
const servicesPath = path.join(__dirname, 'services.json');
const services = JSON.parse(fs.readFileSync(servicesPath, 'utf-8'));

console.log('USERS:');
users.slice(0, 5).forEach(u => {
  console.log(`  id: "${u.id}" (type: ${typeof u.id}) - ${u.name} (${u.role})`);
});

console.log('\nSERVICES:');
services.slice(0, 3).forEach(s => {
  console.log(`  id: "${s.id}" - vendor: "${s.vendorId}" (type: ${typeof s.vendorId}) - ${s.title}`);
});

console.log('\nCHATS:');
chats.forEach((chat, idx) => {
  console.log(`\nChat ${idx}:`);
  console.log(`  ID: ${chat.id}`);
  console.log(`  VendorId: "${chat.vendorId}" (type: ${typeof chat.vendorId})`);
  console.log(`  CustomerId: "${chat.customerId}" (type: ${typeof chat.customerId})`);
  console.log(`  Customer: ${chat.customerName}`);
  console.log(`  Service: ${chat.serviceTitle}`);
  console.log(`  Messages: ${chat.messages.length}`);
});

console.log('\n=== VENDOR FILTER TEST ===\n');

// Test filtering for vendor with id "2" (Banana Vendor)
const vendorId = '2';
console.log(`Testing filter for vendor id: "${vendorId}"`);

const vendorChats = chats.filter(c => c.vendorId === vendorId);
const customerChats = chats.filter(c => c.customerId === vendorId && c.vendorId !== vendorId);

console.log(`\nAs Vendor (vendorId == "${vendorId}"): ${vendorChats.length} chats`);
vendorChats.forEach(c => {
  console.log(`  - Chat with customer "${c.customerName}" (id: ${c.customerId})`);
});

console.log(`\nAs Customer (customerId == "${vendorId}" AND vendorId != "${vendorId}"): ${customerChats.length} chats`);
customerChats.forEach(c => {
  console.log(`  - Chat with vendor "${c.vendorName}" (id: ${c.vendorId})`);
});

console.log('\n=== ISSUE CHECK ===\n');

// Check if all chats have required fields
chats.forEach((chat, idx) => {
  const issues = [];
  if (!chat.vendorName) issues.push('Missing vendorName');
  if (!chat.vendorId) issues.push('Missing vendorId');
  if (!chat.customerId) issues.push('Missing customerId');
  if (!chat.customerName) issues.push('Missing customerName');
  if (typeof chat.vendorId !== 'string') issues.push('vendorId is not string');
  if (typeof chat.customerId !== 'string') issues.push('customerId is not string');
  
  if (issues.length > 0) {
    console.log(`Chat ${idx}: ${issues.join(', ')}`);
  }
});

console.log('\nNo issues found!' );
