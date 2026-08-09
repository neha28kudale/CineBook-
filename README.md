# Ticket & Treat

Build a full-stack Online Movie Ticket Booking System where users can browse movies, pick a theatre/showtime, select seats on a visual seat map, pre-order food & beverages, pay online, and get a digital ticket. Theatre/system admins manage movies, shows, seat layouts, food menu, and view reports.

Unique selling feature: Food & beverage pre-ordering linked to the ticket, for pickup at the counter before the movie — no queueing during intervals.

2. Tech Stack (suggested)

Frontend: React + TypeScript + Tailwind CSS + shadcn/ui

Backend: Node.js (Express) or Supabase (Postgres + Auth + Realtime) — Supabase is ideal here because seat locking needs realtime updates

Auth: Email/password + OAuth (Google) via Supabase Auth

Database: PostgreSQL

Payments: Stripe or Razorpay test mode (UPI/card/netbanking/wallet simulated in test mode)

State/data fetching: React Query

Realtime seat locking: Supabase Realtime channels (or WebSockets) so two users never book the same seat

If using /Bolt/v0, tell it: "Use Supabase for auth, database, and realtime seat locking."

3. User Roles

Customer — browse, book, pay, pre-order food, view history

Theatre Admin — manage their theatre's screens, shows, seat layouts

System Admin — manage movies, all theatres, food menu, global reports

4. Core Features to Build

4.1 Auth

Sign up / log in / forgot password (Supabase Auth)

Role-based redirect (customer vs admin dashboard)

4.2 Movie Browsing & Search

Now Showing / Upcoming tabs

Movie detail page: poster, trailer (embed), synopsis, cast, rating, genre, language, duration

Search & filter by name, language, genre, theatre, date

4.3 Theatre & Showtime Selection

Pick theatre → date → showtime

Show available seat count per showtime before entering seat map

4.4 Seat Selection (Visual Seat Map) — priority UI feature

Build this as its own component. Requirements:

Render seats in a grid matching the real screen layout (rows A–J, curved "SCREEN" label at top)

Color coding:

🟩 Green = Available

🟥 Red = Already booked (not clickable, slightly reduced opacity)

🟦 Blue/Highlighted = Currently selected by this user

🟨 [Added] Amber/pulsing = Locked by another user right now (temporary hold, e.g. mid-payment)

⬜ [Added] Grey = Aisle/gap (not a seat)

Seat types with price tiers [Added]: Silver / Gold / Premium/Recliner — differentiate with subtle color tint or a small badge, and show a legend

Hover/tap shows seat number in a tooltip; selected seats listed in a sticky summary bar with running total price

Responsive: seat grid should scroll horizontally on mobile with pinch/scroll, not break layout

Smooth micro-interactions: scale-up + checkmark animation on select, shake animation if user tries to click a booked seat

Sticky bottom bar: "X seats selected · ₹Total · Continue" button

4.5 Seat Locking (Reliability requirement from SRS)

When a seat is selected, lock it for 10 minutes (configurable) in the DB with a locked_by + locked_until timestamp

Use a countdown timer visible to the user ("Seats reserved for 09:58")

If payment isn't completed before expiry, auto-release the lock (cron job / Supabase Edge Function, or check-on-read)

Use a DB transaction / unique constraint on (show_id, seat_id) to guarantee no double booking even under concurrent requests

4.6 Food Reservation (the differentiator)

After seat selection, show a food menu step: Popcorn, Soft Drinks, Nachos, Pizza, Fries, Combos

Quantity steppers per item, live running total

Items have images, veg/non-veg tag [Added], and combo suggestions ("Add popcorn + drink combo and save ₹30") [Added]

Food order stored linked to booking_id

Order summary screen shows tickets + food + total before payment

"Skip food" option should be easy and non-guilt-trippy

4.7 Payment

Payment method selection: UPI / Card / Netbanking / Wallet (use Stripe/Razorpay test mode)

On success: create booking + payment record atomically, release any leftover lock, generate ticket

On failure: release seat locks immediately, let user retry

4.8 Booking Confirmation & Ticket

Confirmation screen with animated checkmark

Digital ticket: QR code (encodes booking ID) [Added] for counter scanning of both entry and food pickup

Downloadable PDF ticket

Email/SMS confirmation [Added, optional]

4.9 Booking History

List past & upcoming bookings with status (Upcoming / Completed / Cancelled)

View/download ticket again, view food order details

Cancel booking with refund logic [Added, optional] if the show is >X hours away

4.10 Admin Dashboard

Movies: add/edit/delete, upload poster, mark now-showing/upcoming

Theatres & Screens: CRUD, seat layout builder (rows × columns, mark aisles, assign seat tiers) [Added: a visual drag/click layout builder is a great standout feature]

Shows: schedule showtimes per screen per movie

Food menu: CRUD items, pricing, availability toggle, mark sold-out

Reports: bookings by day/theatre/movie, revenue, food sales, occupancy % [Added: simple charts using recharts]

5. Database Schema (Postgres)

sql

-- Users
users (id, name, email, password_hash, role, phone, created_at)

-- Movies
movies (id, title, description, genre, language, duration_min, rating, poster_url, trailer_url, status enum('now_showing','upcoming'), release_date)

-- Theatres
theatres (id, name, address, city)

-- Screens
screens (id, theatre_id, name, total_seats)

-- Seat layout (per screen, static)
seats (id, screen_id, row_label, seat_number, seat_type enum('silver','gold','premium'), is_aisle_gap bool)

-- Shows
shows (id, movie_id, screen_id, show_date, show_time, base_price)

-- Show seat status (per show — this is what gets locked/booked)
show_seats (id, show_id, seat_id, status enum('available','locked','booked'), locked_by, locked_until)

-- Bookings
bookings (id, user_id, show_id, total_amount, status enum('pending','confirmed','cancelled'), created_at)

-- Booking <-> seats
booking_seats (id, booking_id, seat_id, price)

-- Payments
payments (id, booking_id, method, amount, status, transaction_ref, paid_at)

-- Food menu
food_items (id, name, category, price, image_url, is_veg, is_available)

-- Food orders
food_orders (id, booking_id, food_item_id, quantity, price_at_order)

Add a unique constraint on show_seats(show_id, seat_id) and use row-level locking (SELECT ... FOR UPDATE) or Supabase transactions when confirming a seat to prevent double booking under concurrency.

6. Non-Functional Requirements to Honor

Response time <3s — lazy-load images, paginate movie lists

Encrypted passwords (handled by Supabase Auth / bcrypt if custom)

HTTPS + secure payment handling (never store raw card data — use Stripe/Razorpay tokens)

No double booking — enforced at DB level, not just UI

Mobile-responsive throughout, especially the seat map

7. Design Direction [Added]

Dark cinema-themed UI: deep charcoal/near-black background, warm accent color (amber or red) for CTAs — evokes a theatre lobby, not a generic SaaS dashboard

Movie posters in a bold grid with hover-zoom

Seat map is the visual centerpiece — give it generous spacing and a subtle "screen glow" element above row A

Use skeleton loaders, not spinners, while movies/seats load

8. Suggested Build Order (Sprints)

Sprint 1: Auth, movie listing, movie detail, search/filter

Sprint 2: Theatre/showtime selection, seat map UI + locking, payment (test mode)

Sprint 3: Food reservation flow, booking confirmation + ticket/QR, booking history

Sprint 4: Admin dashboard (movies, theatres, seat layout builder, food menu, reports), testing, polish, deploy

## Development

Vercel 

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
