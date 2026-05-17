const fs = require('fs');

function analyze() {
  try {
    // Read and trim to handle possible BOM or trailing characters
    const chatsData = fs.readFileSync('chats.json', 'utf8').trim();
    const usersData = fs.readFileSync('users.json', 'utf8').trim();

    // Remove BOM if exists (common in UTF-8 files from Windows)
    const chatsClean = chatsData.replace(/^\uFEFF/, '');
    const usersClean = usersData.replace(/^\uFEFF/, '');

    const chats = JSON.parse(chatsClean);
    const users = JSON.parse(usersClean);

    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = u;
    });

    console.log('--- Analysis Report ---');
    console.log('1. Total chats: ' + chats.length);

    const vendorToVendorChats = chats.filter(chat => {
      const vendorUser = userMap[chat.vendorId];
      const customerUser = userMap[chat.customerId];
      return vendorUser && vendorUser.role === 'vendor' && customerUser && customerUser.role === 'vendor';
    });

    console.log('2. Vendor-to-vendor chats count: ' + vendorToVendorChats.length);

    if (vendorToVendorChats.length > 0) {
      console.log('\n3. Message Sender Attribution in Vendor-to-Vendor Chats:');
      vendorToVendorChats.forEach(chat => {
        console.log('Chat ID: ' + chat.id + ' (Vendor: ' + chat.vendorId + ', Customer: ' + chat.customerId + ')');
        chat.messages.forEach(msg => {
          const sender = userMap[msg.senderId];
          const senderRole = sender ? sender.role : 'unknown';
          const isAttributedCorrectly = (msg.senderId === chat.vendorId || msg.senderId === chat.customerId);
          console.log('  - Msg from ' + msg.senderId + ' (' + senderRole + '): ' + (isAttributedCorrectly ? 'Correctly attributed' : 'MISATTRIBUTED'));
        });
      });
    }

    console.log('\n4. Filtering Logic Test:');
    const testVendor = users.find(u => u.role === 'vendor');
    if (testVendor) {
      const testVendorId = testVendor.id;
      console.log('Testing filtering for Vendor ID: ' + testVendorId);
      const visibleAsProvider = chats.filter(c => c.vendorId === testVendorId);
      const visibleAsCustomer = chats.filter(c => c.customerId === testVendorId);
      console.log('  - Visible as Provider (vendorId): ' + visibleAsProvider.length);
      console.log('  - Visible as Customer (customerId): ' + visibleAsCustomer.length);
      console.log('  - Total visible chats: ' + (visibleAsProvider.length + visibleAsCustomer.length));
    } else {
      console.log('No vendor found for filtering test.');
    }

  } catch (err) {
    console.error('Error during analysis: ' + err.message);
  }
}

analyze();
