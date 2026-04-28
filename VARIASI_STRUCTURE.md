# Struktur Variasi untuk VendorProductForm

## Overview
Fitur Variasi didesain untuk memungkinkan vendor membuat variasi produk/jasa dengan opsi-opsi yang dapat dikustomisasi.

## Data Structure

```javascript
// formData.variations = {
//   "variasi1": {
//     id: "variasi1",
//     name: "Jenis",  // Nama variasi
//     options: [
//       { id: "opt1", label: "Asus" },
//       { id: "opt2", label: "Apple" },
//       { id: "opt3", label: "Lenovo" }
//     ]
//   },
//   "variasi2": {
//     id: "variasi2", 
//     name: "Warna",
//     options: [
//       { id: "opt4", label: "Hitam" },
//       { id: "opt5", label: "Putih" },
//       { id: "opt6", label: "Merah" }
//     ]
//   }
// }
```

## UI Components

### 1. Variasi Section Button
- Located in main form
- Shows: "● Variasi" text with "0/2" progress indicator (similar to Spesifikasi/Deskripsi)
- Click opens modal

### 2. Variasi Modal
- Header: "● Variasi" with close button
- Two-column layout showing variasi groups
- Each variasi shows:
  - Variasi name (Variasi1, Variasi2, etc.)
  - Input field for variasi name (Jenis, Warna, etc.)
  - "Opsi ●" label with add button
  - List of options in 2-column grid
  - Each option has:
    - Label input field
    - Add button (+)
    - Delete button (trash icon)

### 3. Implementation Pattern
Match structure exactly with Tabel Spesifikasi:
- Modal overlay with rounded corners
- Table-like layout inside scrollable area
- Action buttons: "Batal" and "Simpan"
- Same styling and spacing

## Key Features
1. **Multiple Variations**: Support for multiple variasi (Variasi1, Variasi2, etc.)
2. **Dynamic Options**: Each variasi can have multiple options
3. **Easy Management**: Add/remove variasi and options
4. **Progress Tracking**: Show completion status (0/X)
5. **Validation**: Ensure variasi name is filled before saving

## Integration Points
- State management in VendorProductForm
- Modal state: isVariasiModalOpen
- Form submission includes variations
- API endpoint handles variations in product/jasa data
