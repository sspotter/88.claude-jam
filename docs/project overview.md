# Project Overview

## Summary

This project is a seller-focused e-commerce and inventory management app built with React, TypeScript, and Vite. The main goal is to help small sellers manage products, track orders, and understand business performance with as little friction as possible.

The product is designed to be simple, fast, and actionable. It should help a non-technical seller answer questions like:

- What is selling well?
- What orders still need attention?
- Which products are low in stock?
- How much revenue is coming in?

Currency throughout the app is AED.

## Core Goals

- Keep the interface simple and easy to understand
- Minimize clicks for common seller tasks
- Surface the most important actions and alerts first
- Provide useful dashboards, not just raw data
- Leave room for scaling into a larger store management system later

## Current App Areas

### Storefront

The public-facing side of the app includes:

- Home page
- Category browsing
- Product detail view
- Cart
- Checkout
- Basic search and navigation

### Admin / Seller Dashboard

The admin area includes:

- Dashboard
- Analytics
- Orders
- Products
- Inventory
- Customers
- Categories
- Offers
- Settings
- Simulators
- Login

## Existing Feature Set

### Product Management

The app already supports product management workflows such as:

- Viewing a product list
- Showing product name, category, price, and availability
- Displaying image thumbnails
- Editing products
- Deleting products
- Adding new products

### Order Tracking

The dashboard already tracks order-related information such as:

- Pending orders
- Shipped orders
- Total pending order value
- Shipped revenue
- Recent orders
- Order fulfillment actions

### Metrics

The dashboard highlights high-level business metrics including:

- Pending orders
- Shipped orders
- Projected revenue
- Total product count
- Average order value in some views
- Revenue comparisons over time

### Charts and Analytics

The app includes chart-based reporting such as:

- Sales over time
- Orders volume
- Revenue vs. orders trends
- Product performance
- Inventory health
- Top and low-performing products

### Notifications and Alerts

The UI also supports alerts and attention cues for things like:

- Low stock products
- Pending orders
- High-value orders
- Operational warnings that need seller action

## Technical Stack

- React 19
- TypeScript
- Vite
- Firebase
- React Router
- Zustand for state management
- Recharts for visualizations
- Tailwind CSS
- i18next for localization
- Sonner for toasts
- Lucide icons

## Data and Backend Context

The app appears to rely on Firebase-backed data for products and orders, with admin views deriving metrics from those collections. Important computed values include:

- Order counts by status
- Revenue totals
- Pending order value
- Product performance summaries
- Inventory health indicators

When suggesting backend logic, keep it practical and lightweight. Prefer simple calculations and clear Firestore structure over overly complex enterprise designs.

## UX Principles For This Project

When working on this app, prioritize:

- Fast access to the most important seller actions
- Clear hierarchy and readable data
- Minimal clutter
- Mobile-friendly layouts where relevant
- Plain-language labels for non-technical users
- High-impact suggestions over theoretical features

## Useful Implementation Context

- The app already has both storefront and admin-facing routes
- The seller dashboard is the most important area for business operations
- Analytics should help sellers take action, not just inspect charts
- Product and order data should be easy to edit and reason about
- Any new feature should be evaluated by how much time it saves the seller

## Good Future Questions To Ask About This Project

- How can we make the dashboard more actionable?
- What is the best layout for product and order management?
- How should revenue and order metrics be calculated?
- What Firestore structure should we use for scaling?
- Which features will reduce seller friction the most?
- How can we improve chart readability and insight quality?

## One-Line Prompt For Future Chats

Use this project context when answering:

> This is a React + TypeScript + Vite seller dashboard and e-commerce app backed by Firebase. Focus on simple, practical, seller-friendly improvements to products, orders, analytics, inventory, and UX, with all currency in AED and minimal clicks for non-technical users.

