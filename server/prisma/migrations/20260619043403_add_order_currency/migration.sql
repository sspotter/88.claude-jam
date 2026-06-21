-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'AED';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "priceSource" TEXT DEFAULT 'manual';
