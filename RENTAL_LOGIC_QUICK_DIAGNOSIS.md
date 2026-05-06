# 🔴 RENTAL LOGIC - QUICK DIAGNOSIS REPORT

**Tanggal:** 6 Mei 2026  
**Status:** CRITICAL BUGS FOUND  
**Time to Fix:** 2-3 minggu (dengan testing)

---

## 🚨 MASALAH UTAMA

### 1️⃣ STOK TIDAK BERKURANG ❌

Saat customer membayar sewa:
- Booking dibuat ✅
- Stock ditampilkan berkurang (UI) ✅  
- **TAPI service.quantity TIDAK BERUBAH** ❌

```
Real scenario:
- Total kursi = 100
- Customer A sewa 50
- Available terlihat = 50 ✅
- TAPI: Actual stok masih 100! ❌

Risiko: 
- Customer B bisa sewa kursi yang sudah di-book
- Atau saat A return, stok langsung available lagi padahal belum di-verifikasi
```

**Fix:** Decrement service.quantity saat pickup confirmed, increment saat return accepted

---

### 2️⃣ HARGA TIDAK SESUAI ❌

Customer pilih item tapi harganya bisa salah:
```
Pilih: Kursi Modern @ Rp 50.000/pcs
Order: 100 pcs
Expected: Rp 5.000.000

Actual: Rp 7.500.000 (ambil dari kursi jenis lain!) ❌
```

**Root cause:** Tidak ada `itemId` tracking, `basePrice` dari sumber yang salah

**Fix:** Simpan itemId & verify price dari service.items[].hargaSesi

---

### 3️⃣ RENTAL CYCLE 2+ JADI SALAH ❌

Saat customer sewa lagi:
```
Cycle 1: Sewa 1-6 Mei ✅
Cycle 2: Sewa 10-15 Mei
  BUT: System masih refer ke cycle 1 dates!
  Return 15 Mei dianggap TELAT 9 hari!
  Charge customer unfairly! 🚨
```

**Root cause:** Deal di-reuse, dates tidak di-reset

**Fix:** Create fresh deal, reset semua dates

---

## ✅ 5 SOLUSI (Prioritas)

```
┌─────────────────────────────────────────────┐
│ 1. ITEM-BASED PRICING          [EASY]       │
│    → Add itemId, verify price              │
│    → Expected: 1-2 hari                    │
├─────────────────────────────────────────────┤
│ 2. BOOKING LIFECYCLE           [MEDIUM]     │
│    → Add states, create APIs               │
│    → Expected: 3-4 hari                    │
├─────────────────────────────────────────────┤
│ 3. DEAL CYCLE RESET            [EASY]       │
│    → Create fresh deal, don't reuse        │
│    → Expected: 1 hari                      │
├─────────────────────────────────────────────┤
│ 4. STOCK ACTUAL DECREMENT      [HARD]       │
│    → Change on pickup/return               │
│    → Expected: 3-4 hari                    │
├─────────────────────────────────────────────┤
│ 5. RETURN VALIDATION           [MEDIUM]     │
│    → Use current deal dates                │
│    → Expected: 1-2 hari                    │
└─────────────────────────────────────────────┘

Total: 2-3 minggu (with testing)
```

---

## 📊 IMPACT SEVERITY

### HIGH RISK - Must Fix Immediately:
- 🔴 Double-booking possible (Bug #1)
- 🔴 Wrong payment amount (Bug #2)  
- 🔴 Unfair late charges (Bug #3)

### MEDIUM RISK - Should Fix Soon:
- 🟠 Booking state confusion
- 🟠 Stock permanently stuck after cancellation

### User Impact:
- ❌ Customers: Pay wrong amount, unfair late charges
- ❌ Vendors: Double-bookings, inventory issues
- ❌ Platform: Lost trust, potential refunds

---

## 📝 DETAILED DOCS CREATED

✅ **RENTAL_LOGIC_BUG_ANALYSIS.md**
- Full analysis of each bug
- Code examples
- Scenarios

✅ **RENTAL_LOGIC_FLOW_VISUAL.md** 
- Before/After flows
- Visual diagrams
- Broken vs correct logic

✅ **RENTAL_LOGIC_IMPLEMENTATION.md**
- Step-by-step fixes with code
- New API endpoints
- Testing checklist

✅ **RENTAL_LOGIC_EXECUTIVE_SUMMARY.md**
- Quick reference
- Timeline
- Metrics to track

---

## 🎯 RECOMMENDED NEXT STEPS

1. **Review** this analysis with team
2. **Prioritize** Fix #1 (item pricing) - lowest risk, easy win
3. **Plan** Fix #2 carefully (complex, affects core logic)
4. **Schedule** implementation sprint (2-3 weeks)
5. **Test** thoroughly before production deployment

---

## 🔗 WHERE TO START

**For quick understanding:**
→ Read this file + RENTAL_LOGIC_EXECUTIVE_SUMMARY.md

**For implementation:**
→ Follow RENTAL_LOGIC_IMPLEMENTATION.md step-by-step

**For deep dive:**
→ Study RENTAL_LOGIC_BUG_ANALYSIS.md + FLOW_VISUAL.md

---

**Status:** Analysis Complete ✅  
**Next:** Implementation Planning ⏳  
**Documentation:** Ready for team review 📋
