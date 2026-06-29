-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "subtotal" DECIMAL(10,2),
ADD COLUMN "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Copy dữ liệu cũ
UPDATE "Order"
SET "subtotal" = "totalAmount";

-- Sau khi dữ liệu đã đầy đủ thì mới bắt buộc NOT NULL
ALTER TABLE "Order"
ALTER COLUMN "subtotal" SET NOT NULL;