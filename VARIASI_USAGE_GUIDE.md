# VARIASI FEATURE - USAGE GUIDE

## 📋 CONTOH PENGGUNAAN

### Skenario 1: Laptop dengan Variasi Jenis dan Warna

**Langkah 1: Buka Modal Variasi**
```
Klik button "● Variasi" di form tambah produk
```

**Langkah 2: Tambah Variasi Pertama**
```
Input: "Jenis"
Click: "+ Tambah"
```

Modal akan menampilkan:
```
┌─ Variasi 1 ─────────────────────────────── [🗑️ Hapus]
│
│ [Jenis                           ]
│
│ Opsi ●
│ [+ Tambah Opsi]
│
└─────────────────────────────────────────────────
```

**Langkah 3: Tambah Opsi untuk Variasi Pertama**
```
Click: "+ Tambah Opsi"
Input: "Asus" → Click "+"
Input: "Apple" → Click "+"
Input: "Lenovo" → Click "+"
```

Modal akan menampilkan:
```
┌─ Variasi 1 ─────────────────────────────── [🗑️ Hapus]
│
│ [Jenis                           ]
│
│ Opsi ●
│ ┌────────────────┬────────────────┐
│ │ [Asus      ] 🗑 │ [Apple     ] 🗑 │
│ │ [Lenovo    ] 🗑 │                 │
│ └────────────────┴────────────────┘
│ [Input box] [+]
│
└─────────────────────────────────────────────────

Tambah Variasi Baru
[Warna                     ] [+ Tambah]
```

**Langkah 4: Tambah Variasi Kedua**
```
Input: "Warna"
Click: "+ Tambah"
```

Modal akan menampilkan:
```
┌─ Variasi 1 ─────────────────────────────── [🗑️ Hapus]
│ [Jenis                           ]
│ Opsi ● (Asus, Apple, Lenovo)
└─────────────────────────────────────────────────

┌─ Variasi 2 ─────────────────────────────── [🗑️ Hapus]
│
│ [Warna                           ]
│
│ Opsi ●
│ [+ Tambah Opsi]
│
└─────────────────────────────────────────────────

Tambah Variasi Baru
[                              ] [+ Tambah]
```

**Langkah 5: Tambah Opsi untuk Variasi Kedua**
```
Click: "+ Tambah Opsi"
Input: "Hitam" → Click "+"
Input: "Putih" → Click "+"
Input: "Silver" → Click "+"
```

**Langkah 6: Simpan dan Lanjut**
```
Click: "Simpan" button (red)
```

Data yang tersimpan:
```javascript
formData.variations = {
  "variasi1234567890": {
    name: "Jenis",
    options: [
      { id: "opt1", label: "Asus" },
      { id: "opt2", label: "Apple" },
      { id: "opt3", label: "Lenovo" }
    ]
  },
  "variasi0987654321": {
    name: "Warna",
    options: [
      { id: "opt4", label: "Hitam" },
      { id: "opt5", label: "Putih" },
      { id: "opt6", label: "Silver" }
    ]
  }
}
```

---

## 🎬 BUTTON DISPLAY

Setelah ditambahkan, button di form akan menampilkan:

```
SEBELUM:
┌────────────────────────────────────────┐
│ ● Variasi                            0 │
│ Klik untuk mengelola variasi         → │
│ (opsional).                            │
└────────────────────────────────────────┘

SESUDAH (2 variasi ditambahkan):
┌────────────────────────────────────────┐
│ ● Variasi                            2 │
│ Klik untuk mengelola variasi         → │
│ (opsional).                            │
└────────────────────────────────────────┘
```

---

## 🎨 MODAL LAYOUT

```
┌─────────────────────────────────────────────────────────┐
│ ● Variasi Barang                                     [×] │
├─────────────────────────────────────────────────────────┤
│ Buat variasi untuk memberikan pilihan kepada pelanggan  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ ┌─ Variasi 1 ───────────────────────── [🗑️ Hapus]      │
│ │ [Input Jenis                    ]                      │
│ │ Opsi ●                                                │
│ │ [Asus      ] 🗑  [Apple     ] 🗑                      │
│ │ [Lenovo    ] 🗑  [           ] 🗑                      │
│ │ [Input box] [+]                                       │
│ └────────────────────────────────────────────────────────│
│                                                           │
│ ┌─ Variasi 2 ───────────────────────── [🗑️ Hapus]      │
│ │ [Input Warna                    ]                      │
│ │ Opsi ●                                                │
│ │ [Hitam     ] 🗑  [Putih     ] 🗑                      │
│ │ [Silver    ] 🗑  [           ] 🗑                      │
│ │ [Input box] [+]                                       │
│ └────────────────────────────────────────────────────────│
│                                                           │
│ Tambah Variasi Baru                                      │
│ [Input text...             ] [+ Tambah]                 │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                          [Batal]  [Simpan]              │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ TECHNICAL DETAILS

### State Management
```javascript
// Di VendorProductForm.js
const [isVariasiModalOpen, setIsVariasiModalOpen] = useState(false);
const [editingVariasiId, setEditingVariasiId] = useState(null);
const [variationName, setVariationName] = useState('');
const [newOptionLabel, setNewOptionLabel] = useState('');
```

### Data Flow
```
User Input
    ↓
Handler Function (handleAdd/Edit/DeleteVariation)
    ↓
setFormData(prev => ({ ...prev, variations: {...} }))
    ↓
formData.variations updated
    ↓
On Form Submit → API receives variations data
    ↓
Backend stores in database
```

### Handler Functions Reference

| Function | Purpose | Triggered By |
|----------|---------|--------------|
| `handleOpenVariasiModal()` | Buka modal dan reset state | Button click |
| `handleAddVariation()` | Tambah variasi baru | "+ Tambah" button |
| `handleDeleteVariation(id)` | Hapus variasi | "🗑️ Hapus" button |
| `handleRenameVariation(id, name)` | Edit nama variasi | Input onChange |
| `handleAddOption(variasiId)` | Tambah opsi ke variasi | "+" button (option) |
| `handleDeleteOption(variasiId, optionId)` | Hapus opsi | "🗑️" button (option) |

---

## 🔗 INTEGRATION WITH EXISTING FEATURES

### Dalam Form
```
┌─ Kategori Produk ──────────────────────────┐
├─ Judul / Nama ─────────────────────────────┤
├─ Foto Produk ──────────────────────────────┤
├─ 🧩 Tabel Spesifikasi [Required]           │
├─ 📄 Tabel Deskripsi [Required]             │
├─ ● Variasi [Optional] ← NEW FEATURE        │
├─ 📦 Katalog Barang / Aset ─────────────────┤
├─ 📋 Checklist ──────────────────────────────┤
└─ [Submit Button] ──────────────────────────┘
```

### Data Submission
```javascript
// API akan menerima:
{
  mainCategory: "Elektronik",
  title: "Laptop Asus ROG",
  images: [...],
  specifications: {...},
  descriptionTable: {...},
  variations: {  // ← Variasi data ditambahkan
    "variasi1": {
      id: "variasi1",
      name: "Jenis",
      options: [...]
    },
    "variasi2": {
      id: "variasi2",
      name: "Warna",
      options: [...]
    }
  },
  items: [...],
  checklist: {...}
}
```

---

## 📱 RESPONSIVE BEHAVIOR

- **Desktop (>1024px)**: Modal full width max 920px, opsi grid 2-kolom
- **Tablet (768-1024px)**: Modal 100% - padding, opsi grid 1-kolom
- **Mobile (<768px)**: Modal 100% - padding, opsi grid 1-kolom, smaller fonts

---

## ✅ VALIDATION RULES

1. ✓ Nama variasi tidak boleh kosong
2. ✓ Label opsi tidak boleh kosong
3. ✓ Opsi harus unik dalam satu variasi (opsional - bisa ditambahkan validasi di API)
4. ✓ Maksimum 10 variasi per produk (opsional - bisa dikonfigurasi)
5. ✓ Maksimum 20 opsi per variasi (opsional - bisa dikonfigurasi)

---

## 🚀 FUTURE ENHANCEMENTS

### Phase 1 (Now)
- ✅ Tambah/Edit/Hapus Variasi
- ✅ Tambah/Hapus Opsi
- ✅ Modal dengan table-like styling
- ✅ Real-time counter

### Phase 2 (Planned)
- ⏳ Drag-to-reorder variasi dan opsi
- ⏳ Bulk import dari CSV
- ⏳ Duplicate check untuk opsi
- ⏳ Preset templates (Jenis, Warna, Ukuran, dll)

### Phase 3 (Future)
- ⏳ Pricing matrix berdasarkan kombinasi variasi
- ⏳ Stock management per kombinasi
- ⏳ Visual preview di customer page
- ⏳ Analytics untuk popular combinations
