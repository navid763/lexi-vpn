-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('new_order', 'renewal');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "renewal_subscription_id" INTEGER,
ADD COLUMN     "type" "OrderType" NOT NULL DEFAULT 'new_order';

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_renewal_subscription_id_fkey" FOREIGN KEY ("renewal_subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
