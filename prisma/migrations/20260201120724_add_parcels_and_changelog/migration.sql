-- CreateTable
CREATE TABLE "parcels" (
    "id" TEXT NOT NULL,
    "plot_id" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "area_record" DOUBLE PRECISION NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_logs" (
    "id" TEXT NOT NULL,
    "parcel_id" TEXT,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field_name" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parcels_user_id_idx" ON "parcels"("user_id");

-- CreateIndex
CREATE INDEX "parcels_plot_id_idx" ON "parcels"("plot_id");

-- CreateIndex
CREATE UNIQUE INDEX "parcels_user_id_plot_id_key" ON "parcels"("user_id", "plot_id");

-- CreateIndex
CREATE INDEX "change_logs_user_id_idx" ON "change_logs"("user_id");

-- CreateIndex
CREATE INDEX "change_logs_parcel_id_idx" ON "change_logs"("parcel_id");

-- CreateIndex
CREATE INDEX "change_logs_created_at_idx" ON "change_logs"("created_at");

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_logs" ADD CONSTRAINT "change_logs_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_logs" ADD CONSTRAINT "change_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
