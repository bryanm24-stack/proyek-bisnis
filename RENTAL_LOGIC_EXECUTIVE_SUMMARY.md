# 🚨 RENTAL LOGIC - EXECUTIVE SUMMARY

**Status:** 🔴 CRITICAL - Multiple bugs found  
**Date:** 6 Mei 2026  
**Reviewed by:** System Analysis

---

## 📌 THE PROBLEM (3 BUG UTAMA)

### Bug #1: ❌ Stok Tidak Berkurang Saat Sewa
**Impact:** Double-booking bisa terjadi

```
Customer A sewa 50 item → Available = 70 - 50 = 20 ✅
Customer B sewa 30 item → Available = 70 - 30 - 50 = -10??? 
TAPI: service.quantity MASIH 100! ❌

Jika booking A di-complete:
Available langsung = 70 lagi ❌ 
(Padahal item belum benar-benar dikembalikan!)
```

**Root Cause:** `service.quantity` tidak berubah, hanya `availableQuantity` yang "virtual calculate"

---

### Bug #2: ❌ Harga Tidak Match Dengan Item yang Dipilih  
**Impact:** Customer bayar salah (overpay/underpay)

```
Kursi Modern = Rp 50.000/pcs
Customer order 100 pcs → Expected: Rp 5.000.000

TAPI di payment:
basePrice = deal?.totalPrice (dari mana?? ❌)
Bisa jadi = Rp 75.000 (dari item lain!)

Customer bayar: Rp 7.500.000 ❌ OVERPAY!
```

**Root Cause:** 
- Tidak ada `itemId` tracking
- `basePrice` source tidak jelas
- Multi-item service tidak ter-handle

---

### Bug #3: ❌ Rental Cycle 2+ Jadi Salah
**Impact:** Late charge calculation error, customer kena biaya yang tidak mereka sebabkan

```
CYCLE 1:
- borrowDate: 1 Mei
- expectedReturnDate: 6 Mei
- Return on: 6 Mei → On time ✅

CYCLE 2 (REUSE SAME DEAL):
- New borrowDate: 10 Mei
- deal.expectedReturnDate MASIH: 6 Mei ❌
- Return on: 15 Mei
- System calc: 15 Mei > 6 Mei → 9 HARI TELAT! 🚨
- Customer charged unfairly! 🚨
```

**Root Cause:** Deal di-reuse daripada create fresh, dating tidak di-reset

---

## ✅ THE SOLUTION (5 FIXES)

| # | Fix | Severity | Effort | Impact | Order |
|---|-----|----------|--------|--------|-------|
| 1 | Item-based pricing | 🔴 CRITICAL | 🟢 EASY | HIGH | 1️⃣ |
| 2 | Booking lifecycle | 🔴 CRITICAL | 🟠 MEDIUM | HIGH | 2️⃣ |
| 3 | Deal cycle reset | 🟠 HIGH | 🟢 EASY | MEDIUM | 3️⃣ |
| 4 | Stock actual decrement | 🔴 CRITICAL | 🔴 HARD | HIGH | 4️⃣ |
| 5 | Return validation | 🟠 HIGH | 🟠 MEDIUM | MEDIUM | 5️⃣ |

---

## 🎯 QUICK FIX GUIDE

### Fix #1: Item-based Pricing (EASY - Do First)
```
1. Add itemId to transaction
2. Verify price from service.items[].hargaSesi
3. Use item price, not deal.totalPrice
4. Store both itemId & itemPrice for audit

Status: ✅ Detailed implementation in RENTAL_LOGIC_IMPLEMENTATION.md
```

### Fix #2: Booking Lifecycle (MEDIUM - Do Second)  
```
1. Add states: confirmed → in_transit → active → pending_return → completed
2. Create /api/bookings/pickup endpoint (trigger stock decrement)
3. Create /api/bookings/return-confirmed endpoint (trigger stock increment)
4. Stock only changes when actual pickup/return confirmed

Status: ✅ Detailed implementation in RENTAL_LOGIC_IMPLEMENTATION.md
```

### Fix #3: Deal Cycle Reset (EASY - Do Third)
```
1. Check if deal is completed
2. Create FRESH deal (don't reuse)
3. Link via previousDealId (audit trail)
4. Reset all dates/prices to null

Status: ✅ Detailed implementation in RENTAL_LOGIC_IMPLEMENTATION.md
```

### Fix #4: Stock Actual Decrement (HARD - Do Fourth)
```
1. Decrement service.quantity on pickup confirmation
2. Increment service.quantity on return confirmation
3. Tie with Fix #2 (booking lifecycle)
4. Handle cancellations properly

Status: ✅ Covered by Fix #2 implementation
```

### Fix #5: Return Validation (MEDIUM - Do Fifth)
```
1. Validate deal has borrowDate & expectedReturnDate
2. Use dates from current deal (not old deal!)
3. Check deal status is 'agreed'/'active'/'returning'
4. Prevent orphaned returns

Status: ✅ Detailed implementation in RENTAL_LOGIC_IMPLEMENTATION.md
```

---

## 📊 BEFORE & AFTER

### BEFORE (Current - BROKEN)
```
Rental Cycle:
Customer sewa 100 kursi @ Rp 50k = Rp 5.000.000
Customer bayar Rp 7.500.000 ❌ (salah harga!)
Stok = 100 (tidak berkurang) ❌
Return → Stok = 100 (langsung tersedia) ❌
Cycle 2 → 9 hari late charge unfairly! ❌

Hasil: Triple fail! 🚨🚨🚨
```

### AFTER (Fixed - CORRECT)
```
Rental Cycle:
Customer sewa 100 kursi @ Rp 50k = Rp 5.000.000
Customer bayar Rp 5.000.000 ✅ (correct!)
Stok = 100 (virtual reserved as available=0) ✅
Pickup confirmed → Stok = 0 (physically taken) ✅
Return accepted → Stok = 100 (back in system) ✅
Cycle 2 → Fresh deal, correct dates, no unfair charges ✅

Hasil: All correct! ✅✅✅
```

---

## 🚀 IMPLEMENTATION ROADMAP

**Timeline:** 2-3 weeks (with thorough testing)

### Week 1
- Mon-Tue: Fix #1 (Item-based pricing)
- Wed-Thu: Fix #2 Phase 1 (Booking states + pickup API)
- Fri: Fix #2 Phase 2 (Return-confirmed API)

### Week 2
- Mon: Fix #3 (Deal cycle reset)
- Tue-Wed: Fix #4 (Stock actual decrement - integrate with #2)
- Thu: Fix #5 (Return validation)
- Fri: Unit testing

### Week 3
- Mon-Tue: Integration testing
- Wed-Thu: Edge case testing
- Fri: UAT & production readiness

---

## 📋 FILES CREATED (Documentation)

1. ✅ **RENTAL_LOGIC_BUG_ANALYSIS.md** - Detailed bug analysis
2. ✅ **RENTAL_LOGIC_FLOW_VISUAL.md** - Visual flows (current vs correct)
3. ✅ **RENTAL_LOGIC_IMPLEMENTATION.md** - Step-by-step implementation guide
4. ✅ **RENTAL_LOGIC_EXECUTIVE_SUMMARY.md** - This file (quick reference)

---

## 🔍 KEY METRICS TO TRACK

After implementing fixes:

1. **Price Accuracy**
   - [ ] 100% of transactions have correct itemId
   - [ ] 100% of transactions have verified itemPrice
   - [ ] Price = item.hargaSesi × quantity × durationDays

2. **Stock Management**
   - [ ] No double-bookings (test with overlapping dates)
   - [ ] Stok decrements only on pickup confirmation
   - [ ] Stok increments only on return acceptance
   - [ ] availableQuantity always accurate

3. **Rental Cycle**
   - [ ] Each cycle has separate deal
   - [ ] No date mixing between cycles
   - [ ] Late charge calculated correctly for each cycle
   - [ ] audit trail via previousDealId maintained

---

## ⚠️ RISK FACTORS

| Risk | Mitigation |
|------|-----------|
| Breaking existing bookings | Test with current active bookings, migration script for old data |
| Customer confusion on new states | Clear UI updates, customer notifications |
| Vendor workflow changes | Training on new pickup/return confirmation steps |
| Data consistency issues | Validation at each API endpoint |

---

## 📞 NEXT STEPS

1. **Review** this analysis with team
2. **Start** with Fix #1 (item-based pricing) - lowest risk
3. **Plan** Fix #2 implementation carefully (affects stock logic)
4. **Test** each fix independently before integrating
5. **Deploy** to staging first, full UAT before production

---

## 🎓 LEARNING POINTS

Key issues to avoid in future development:

1. ✅ Always track **which item variant** is selected (itemId)
2. ✅ Always **verify pricing** against source data
3. ✅ Use **proper state machines** for complex workflows (don't just reuse objects)
4. ✅ **Actual stock changes** must happen at specific points (pickup/return)
5. ✅ **Virtual availability** is just UI feedback, not actual stock management
6. ✅ **Booking lifecycle** must be clean with clear state transitions
7. ✅ **Audit trails** (previousDealId, timestamps) are essential

---

**For detailed implementation steps, see:** `RENTAL_LOGIC_IMPLEMENTATION.md`
**For visual flow diagrams, see:** `RENTAL_LOGIC_FLOW_VISUAL.md`
**For bug analysis, see:** `RENTAL_LOGIC_BUG_ANALYSIS.md`
