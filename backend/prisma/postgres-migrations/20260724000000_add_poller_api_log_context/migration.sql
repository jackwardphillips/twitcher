ALTER TABLE "EbirdApiCallLog"
  ADD COLUMN "alertPollRunId" TEXT,
  ADD COLUMN "alertTargetPollAttemptId" TEXT;

CREATE INDEX "EbirdApiCallLog_alertPollRunId_idx"
  ON "EbirdApiCallLog"("alertPollRunId");
CREATE INDEX "EbirdApiCallLog_alertTargetPollAttemptId_idx"
  ON "EbirdApiCallLog"("alertTargetPollAttemptId");

ALTER TABLE "EbirdApiCallLog"
  ADD CONSTRAINT "EbirdApiCallLog_alertPollRunId_fkey"
  FOREIGN KEY ("alertPollRunId") REFERENCES "AlertPollRun"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EbirdApiCallLog"
  ADD CONSTRAINT "EbirdApiCallLog_alertTargetPollAttemptId_fkey"
  FOREIGN KEY ("alertTargetPollAttemptId") REFERENCES "AlertTargetPollAttempt"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
