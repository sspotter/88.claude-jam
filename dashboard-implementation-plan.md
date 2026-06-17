# Dashboard Overhaul Implementation Plan

This document outlines the implementation plan for the advanced admin dashboard, focusing on actionable insights, improved UX, and smarter metrics based on the user's feature request.

## Priority 1: Data Model & Foundation Updates
Before advancing the dashboard, our data model needs to support inventory tracking to enable low stock alerts.
- **Task 1.1**: Update `firebase-blueprint.json` and `firestore.rules`. Add `stockCount: number` to the Product entity.
- **Task 1.2**: Update the Product management page (`Projects.tsx`) to allow tracking and updating `stockCount`. Default to out of stock when `0`.

## Priority 2: Smarter Metrics & Quick Actions Panel (The Action Layer)
- **Task 2.1**: Enhance the topmost metric cards:
  - Add Average Order Value (AOV).
  - Update layout to be a sticky header with key stats (UX Improvement).
- **Task 2.2**: Implement a **Quick Actions Panel** on the dashboard:
  - Button: "Add Product" (directs to product page or opens modal)
  - Button: "Manual Order" (directs to orders page modal)
  - Button: "Export Sales" (downloads viewable data)

## Priority 3: Actionable Widgets (The "Needs Attention" Layer)
- **Task 3.1: Recent Orders Widget**:
  - Show a mini-list of the 5 most recent pending orders.
  - Include inline quick actions (e.g., "Mark as Shipped").
- **Task 3.2: Low Stock Alerts Widget**:
  - List products where `stockCount` is below a certain threshold (e.g., < 10).
  - Include an inline action to update stock.
- **Task 3.3: Top / Bottom Performers Widget**:
  - Calculate the highest revenue products from orders.
  - Identify worst-performing products (no sales recently).

## Priority 4: Better Charts & Date Filters
- **Task 4.1: Sales by Category**:
  - Add a pie chart grouping order items by category (requires mapping order items to categories).
- **Task 4.2: Date Filtering**:
  - Add a global dashboard filter: Today / This Week / This Month / All Time.
  - Ensure all metrics and charts react to this filter.

## Priority 5: Smart Suggestions
- **Task 5.1**: Add a simple rules-based suggestion engine section.
  - E.g., "Product X is your best seller, consider increasing stock."
  - E.g., "Product Y hasn't sold recently, consider a discount."

---

## Execution Strategy
We will execute these priorities sequentially, starting with the data model updates (Priority 1) and then moving onto building the dashboard features piece by piece.
