import json

# Read services.json
with open('services.json', 'r', encoding='utf-8-sig') as f:
    services = json.load(f)

# Add bookings field to each service if it doesn't exist
for service in services:
    if 'bookings' not in service:
        service['bookings'] = []
    if 'availableQuantity' not in service:
        service['availableQuantity'] = service.get('quantity', service.get('jumlahBarang', 0))

# Write back
with open('services.json', 'w', encoding='utf-8') as f:
    json.dump(services, f, indent=2, ensure_ascii=False)

print(f"✅ Updated {len(services)} services with bookings field")
print(f"Sample: {services[0].get('id')} - bookings: {len(services[0]['bookings'])}")
