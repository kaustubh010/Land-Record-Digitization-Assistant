-- AlterTable
ALTER TABLE "parcels" ADD COLUMN     "aadhaar_number" TEXT,
ADD COLUMN     "east" DOUBLE PRECISION,
ADD COLUMN     "north" DOUBLE PRECISION,
ADD COLUMN     "south" DOUBLE PRECISION,
ADD COLUMN     "west" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "parcel_id" TEXT NOT NULL,
    "raw_ocr_text" TEXT,
    "extracted_data" JSONB,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plot_history" (
    "id" TEXT NOT NULL,
    "parcel_id" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "ownership_start_date" TIMESTAMP(3),
    "ownership_end_date" TIMESTAMP(3),
    "transaction_type" TEXT NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "source_document_id" TEXT,
    "remarks" TEXT,
    "document_no" TEXT,
    "aadhaar_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plot_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_parcel_id_idx" ON "documents"("parcel_id");

-- CreateIndex
CREATE INDEX "plot_history_parcel_id_idx" ON "plot_history"("parcel_id");

-- CreateIndex
CREATE INDEX "plot_history_source_document_id_idx" ON "plot_history"("source_document_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plot_history" ADD CONSTRAINT "plot_history_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plot_history" ADD CONSTRAINT "plot_history_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
