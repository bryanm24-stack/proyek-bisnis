const fs = require('fs');
const path = require('path');

// Read services.json
const filePath = path.join(process.cwd(), 'services.json');
let data = fs.readFileSync(filePath, 'utf-8');
data = data.replace(/^\uFEFF/, ''); // Remove BOM if exists
const services = JSON.parse(data);

// Add bookings field to each service if it doesn't exist
for (let service of services) {
  if (!service.bookings) {
    service.bookings = [];
  }
  if (!service.availableQuantity) {
    service.availableQuantity = service.quantity || service.jumlahBarang || 0;
  }
}

// Write back
fs.writeFileSync(filePath, JSON.stringify(services, null, 2));

console.log(`✅ Updated ${services.length} services with bookings field`);
console.log(`Sample: ${services[0]?.id} - bookings: ${services[0]?.bookings.length}`);
