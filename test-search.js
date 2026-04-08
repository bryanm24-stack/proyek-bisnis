// Test search filter logic
const chats = [
  {
    id: "1775590870211",
    serviceTitle: "Sediakan Sate Keliling",
    vendorName: "Jeje",
  },
  {
    id: "1775628806493",
    serviceTitle: "Sediakan Cleaning Service",
    vendorName: "Cleaning Master",
  },
];

// Test function
function testSearch(searchQuery) {
  const filteredChats = chats.filter(chat => {
    const searchLower = searchQuery.toLowerCase();
    return (
      chat.vendorName?.toLowerCase().includes(searchLower) ||
      chat.serviceTitle?.toLowerCase().includes(searchLower)
    );
  });
  
  console.log(`Search: "${searchQuery}"`);
  console.log(`Results: ${filteredChats.length}`);
  console.log(filteredChats);
  console.log('---');
}

// Test cases
testSearch(''); // Semua
testSearch('jeje'); // Vendor Jeje
testSearch('sate'); // Service dengan kata sate
testSearch('cleaning'); // Vendor cleaning
testSearch('xyz'); // Tidak ada hasil
