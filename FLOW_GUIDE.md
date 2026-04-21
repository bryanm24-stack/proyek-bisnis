# RentGuard - Complete Flow Documentation

## System Overview
RentGuard is a rental marketplace application with vendor services and customer order management.

##Test Users

### Vendors (all password: 123)
- **apple** - Apple Vendor
- **banana** - Banana Vendor  
- **orange** - Orange Vendor

### Customers (all password: 123)
- **strawberry** - Strawberry Customer
- **grape** - Grape Customer

## Complete User Flow

### 1. Register (New User)
- Go to `/register`
- Choose role: "vendor" or "customer"
- Fill in details (username, password, email, phone)
- Submit

### 2. Login
- Go to `/login`
- Enter username and password (e.g., "strawberry" / "123")
- Select role
- Submit

### 3. Vendor: Create Service
- Login as vendor (e.g., "apple" / "123")
- Go to `/vendor` dashboard
- Create new service:
  - Choose category: "barang" (item) or "jasa" (service)
  - Fill details (name, description, price, etc.)
  - Submit

### 4. Customer: Browse & Order Service
- Login as customer (e.g., "strawberry" / "123")
- Go to `/customer/chats` or `/` homepage
- Find vendor service
- Click "Order" or start chat
- In chat, select service and propose deal:
  - Quantity
  - Duration
  - Other details
- Submit offer

### 5. Vendor: Approve/Reject Deal
- Login as vendor (e.g., "apple" / "123")
- Go to `/vendor/chats` or `/vendor/ongoing`
- View chat with customer
- Approve or reject the order
- If approved → deal created

### 6. Customer: Make Payment
- After vendor approves deal
- Click "Pay" or go to `/transaction/payment?dealId=<DEAL_ID>`
- Enter payment details:
  - Quantity & Duration confirmation
  - Payment method (QRIS/Card/COD)
  - If card: card details & photo
- Submit payment

### 7. Payment Success
- See success page at `/transaction/success`
- Transaction ID provided
- Both customer & vendor can see order status

### 8. Check Order Status (In Progress)
- Customer: Go to `/customer/ongoing`
- Vendor: Go to `/vendor/ongoing`
- See all active rentals with:
  - Item details
  - Rental period
  - Customer/Vendor info
  - Verification photos (from both sides)
  - Status badges

## Key Files

### JSON Data Files
- `users.json` - User accounts (vendors & customers)
- `services.json` - Vendor services catalog
- `deals.json` - Negotiated deals
- `chats.json` - Chat conversations

### Core Pages
- `/login` - User authentication
- `/register` - New user registration
- `/` - Homepage & service catalog
- `/vendor` - Vendor dashboard
- `/vendor/register` - Vendor registration
- `/vendor/chats` - Vendor chat management
- `/vendor/ongoing` - Vendor's active rentals
- `/customer/chats` - Customer chat & orders
- `/customer/ongoing` - Customer's active rentals
- `/transaction/payment` - Payment processing
- `/transaction/success` - Payment confirmation

### API Endpoints
- `GET /api/deals/all` - Fetch all deals with enriched data
- `GET /api/deals?chatId=X` - Get deal for specific chat
- `POST /api/transactions` - Create payment transaction
- `GET /api/transactions` - Fetch user transactions
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/vendor/services` - Fetch all services
- `POST /api/vendor/services` - Create new service
- `GET /api/customer/chats` - Customer's chats
- `GET /api/vendor/chats` - Vendor's chats
- `POST /api/chat` - Send chat message
- `GET /api/ongoing` - Get ongoing rentals

## Testing Scenarios

### Scenario 1: Complete Order Flow
1. Login as customer "strawberry" (pwd: 123)
2. Find vendor service (created by vendor)
3. Start chat & submit order
4. Logout → Login as "apple" vendor (pwd: 123)
5. Approve the deal from chat
6. Logout → Login as "strawberry"
7. Make payment with details
8. Check `/customer/ongoing` for order status

### Scenario 2: Multiple Orders
- Create orders with different vendors
- Compare vendor approval times
- Test payment with different methods
- Track multiple ongoing rentals

### Scenario 3: Order Lifecycle
1. Create order → In negotiation
2. Vendor approves → Deal created
3. Customer pays → Active rental
4. Both verify items → Completed

## Notes
- All passwords are "123" for easy testing
- Usernames are fruit names for quick identification
- System handles both item rentals and service bookings
- Payment is simulated (no real processing)
- Check `/transaction/success?transactionId=X` for payment details
