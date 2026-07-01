-- CreateTable
CREATE TABLE "test_trials" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "uuid" TEXT NOT NULL,
    "config_url" TEXT NOT NULL,
    "sub_url" TEXT,
    "client_email" TEXT,
    "expire_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_trials_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "test_trials" ADD CONSTRAINT "test_trials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
