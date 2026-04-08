# Quick Test Guide - Chat & Deal System

## Test Scenario

### Prerequisites
- Ensure `npm run dev` is running on http://localhost:3000
- Have at least one service in `services.json`

### Step 1: Login as Customer (Member)
1. Open http://localhost:3000
2. Click "Masuk" (Login)
3. Use any member account credentials
   - Example: `member@rentguard.com` / `password` (register first if needed)

### Step 2: Browse Services
1. You'll see service cards on home page
2. Each card shows:
   - Service image
   - Rating badge
   - Short description
   - Price
   - "Lihat Detail →" button

### Step 3: Open Service Detail Modal
1. Click "Lihat Detail →" on any service
2. Modal shows:
   - Full image
   - Vendor name
   - Full description
   - Rating & review count
   - Price
   - "💬 Chat Vendor" button (NEW!)
   - "Tutup" (Close) button

### Step 4: Open Chat Modal
1. Click "💬 Chat Vendor" button
2. Chat modal opens showing:
   - Vendor name and service title
   - ✅ Deal & ❌ Cancel buttons (top)
   - Chat messages area (empty initially)
   - Chat input field at bottom

### Step 5: Send Messages
1. Type a message in the input field
2. Press Enter or click "Kirim" button
3. Message appears on right side (customer messages)
4. Messages persist in chats.json

### Step 6: Test Deal Flow

#### First Party Clicks Deal (Customer)
1. Click ✅ Deal button
2. See alert: "Penawaran dikirim, menunggu vendor menerima"
3. Deal buttons now disabled
4. Chat input still visible (vendor hasn't accepted yet)

#### Second Party Clicks Deal (Vendor - Simulated)
1. Manually edit `deals.json` to simulate vendor accepting
2. Or test by having another browser session as vendor

#### After Both Accept Deal
- Chat input disappears
- ✅ Rating Form appears with:
  - Title: "Berikan Rating & Review"
  - 5 interactive stars (click to select)
  - Text area for review (optional)
  - "Kirim Rating" button

### Step 7: Submit Rating
1. Click desired star (1-5)
2. (Optional) Type review in textarea
3. Click "Kirim Rating"
4. See alert: "Rating berhasil disimpan!"
5. Modal auto-closes
6. Check `services.json`:
   - `rentCount` increased by 1
   - `rating` recalculated with new rating

### Step 8: Test Cancel Flow
1. Open new chat modal
2. Click ❌ Cancel button
3. See alert: "Deal dibatalkan"
4. Deal status becomes "cancelled"
5. No rating form shown
6. Chat input disabled

## File Checks

### After sending messages
Check `chats.json`:
```bash
cat chats.json | tail -50
```
Should see chat with `messages` array populated

### After deal accepted
Check `deals.json`:
```bash
cat deals.json | tail -50
```
Should see deal with `status: "agreed"`

### After rating submitted
Check `ratings.json`:
```bash
cat ratings.json | tail -50
```
Should see rating with rating value and review

Check `services.json`:
```bash
# rentCount should increase by 1
# rating should be recalculated average
```

## Debug Tips

### Check Chat Connection
Open browser DevTools → Network tab:
- POST /api/chat (message sending)
- GET /api/chat (fetch history)
- Status should be 201 (create) or 200 (success)

### Check Deal Processing
Network tab:
- POST /api/deals (action: accept/cancel)
- Should return deal object with updated status

### Check Rating Submission
Network tab:
- POST /api/ratings (rating submission)
- Should return updated service with new rentCount

### Console Logs
All API calls log errors to console if they fail:
```javascript
console.error('Error sending message:', error)
console.error('Error processing deal:', error)
console.error('Error submitting rating:', error)
```

## Known Limitations

1. **Vendor Side**: Currently only customer side is implemented
   - Vendor would need separate chat view to see messages and accept deals
   - For testing, manually edit deals.json to simulate vendor acceptance

2. **Real-time**: No WebSocket implementation
   - Messages don't update in real-time
   - Refresh modal to see new messages

3. **Authentication**: No auth check on APIs
   - Any user can access any chat
   - Should add auth validation in production

4. **Vendor Approval**: Deal doesn't wait for vendor
   - Vendor needs separate interface to see and accept deals
   - Currently customer can unilaterally mark deal as pending

## Success Indicators

✅ Chat modal opens without errors
✅ Messages are stored and retrieved
✅ Deal buttons work and change status
✅ Rating form appears only after deal accepted
✅ Rating updates service rentCount and rating
✅ Cancel button prevents rating form
✅ Modal closes after rating submission
✅ All data persists in JSON files
