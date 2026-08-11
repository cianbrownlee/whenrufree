-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "dayStartTime" TEXT NOT NULL,
    "dayEndTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Respondent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "respondentToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Respondent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "slotStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Respondent_respondentToken_key" ON "Respondent"("respondentToken");

-- CreateIndex
CREATE INDEX "Respondent_eventId_idx" ON "Respondent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilitySlot_respondentId_slotStart_key" ON "AvailabilitySlot"("respondentId", "slotStart");

-- AddForeignKey
ALTER TABLE "Respondent" ADD CONSTRAINT "Respondent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
