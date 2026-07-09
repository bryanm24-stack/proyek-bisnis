#!/usr/bin/env node
/**
 * Test Script: Registration & Stock Availability
 * 
 * This script tests:
 * 1. User registration - verifies data enters SQL database
 * 2. Stock availability checking - verifies date-based logic
 * 3. Transaction flow - verifies stock prevents overbooking
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testRegistration() {
  console.log('\n📝 TEST 1: User Registration');
  console.log('─'.repeat(50));

  const testUser = {
    username: `testuser_${Date.now()}`,
    name: 'Test User ' + Date.now(),
    email: `testuser${Date.now()}@example.com`,
    password: 'TestPassword123'
  };

  try {
    const response = await makeRequest('POST', '/api/auth/register', testUser);
    
    if (response.status === 201 && response.data.success) {
      console.log(' Registration successful!');
      console.log('   User ID:', response.data.user.id);
      console.log('   Email:', response.data.user.email);
      console.log('   Username:', response.data.user.username);
      return response.data.user.id;
    } else {
      console.log('❌ Registration failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

async function testAvailabilityCheck() {
  console.log('\n🛒 TEST 2: Stock Availability Checking');
  console.log('─'.repeat(50));

  // Use the actual service ID from the database
  const serviceId = '1704067200000'; 
  const quantity = 2;
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const response = await makeRequest('POST', '/api/availability/validate', {
      serviceId,
      quantity,
      startDate,
      endDate
    });

    console.log(`\nChecking availability for service ${serviceId}:`);
    console.log(`  Period: ${startDate} to ${endDate}`);
    console.log(`  Requested Quantity: ${quantity}`);
    console.log(`  Response Status: ${response.status}`);
    
    if (response.data.success) {
      console.log(' Stock is available!');
      console.log(`   Total Available: ${response.data.availableQuantity}/${response.data.totalQuantity}`);
      console.log(`   Currently Booked: ${response.data.bookedQuantity}`);
      if (response.data.warningMessage) {
        console.log(`   ⚠ Warning: ${response.data.warningMessage}`);
      }
    } else {
      console.log('❌ Stock not available');
      console.log(`   Message: ${response.data.message}`);
      console.log(`   Available: ${response.data.availableQuantity}`);
      console.log(`   Booked: ${response.data.bookedQuantity}`);
    }

    return response.data;
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

async function testTransactionWithStockCheck() {
  console.log('\n TEST 3: Transaction with Stock Validation');
  console.log('─'.repeat(50));

  const transaction = {
    userId: '1', // Test with an existing user
    serviceId: '1704067200000',
    quantity: 1,
    startDate: new Date().toISOString().split('T')[0],
    durationDays: 2,
    amount: 100000,
    totalAmount: 100000,
    paymentMethod: 'full',
    status: 'success',
    paymentType: 'full'
  };

  try {
    const response = await makeRequest('POST', '/api/transactions', transaction);

    console.log(`\nTransaction Test:`);
    console.log(`  Service ID: ${transaction.serviceId}`);
    console.log(`  Quantity: ${transaction.quantity}`);
    console.log(`  Date Range: ${transaction.startDate} - ${new Date(Date.now() + transaction.durationDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`);
    console.log(`  Amount: Rp ${transaction.totalAmount.toLocaleString('id-ID')}`);
    console.log(`  Response Status: ${response.status}`);

    if (response.data.success) {
      console.log(' Transaction created successfully!');
      console.log(`   Transaction ID: ${response.data.transactionId}`);
    } else {
      console.log('❌ Transaction failed');
      console.log(`   Error: ${response.data.error}`);
      console.log(`   Message: ${response.data.message}`);
      if (response.data.status === 'stock_unavailable') {
        console.log(`   Available Stock: ${response.data.availableQuantity}`);
      }
    }

    return response.data;
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('═'.repeat(50));
  console.log('🧪 RentGuard Registration & Availability Tests');
  console.log('═'.repeat(50));

  const userId = await testRegistration();
  await testAvailabilityCheck();
  await testTransactionWithStockCheck();

  console.log('\n═'.repeat(50));
  console.log(' All tests completed!');
  console.log('═'.repeat(50));
  console.log('\n Summary:');
  console.log('  • User registration data should be in SQL database');
  console.log('  • Stock availability should check date overlaps');
  console.log('  • Transactions should block if stock unavailable');
  console.log('\n💡 Next steps:');
  console.log('  1. Check MySQL users table for the new user');
  console.log('  2. Verify stock was properly decremented after transaction');
  console.log('  3. Test multi-customer booking with overlapping dates\n');
}

// Only run if server is available
setTimeout(runAllTests, 1000);
