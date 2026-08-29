import type {
  DistanceUnit,
  OcrStatus,
  OdometerReadingKind,
  OdometerSource,
  ReadingValidationStatus,
  RevisionSource,
} from '@/types/domain';

export type OdometerReading = {
  id: string;
  user_id: string;
  vehicle_id: string;
  reading: number;
  unit: DistanceUnit;
  kind: OdometerReadingKind;
  recorded_on: string;
  recorded_at: string;
  photo_path: string | null;
  notes: string | null;
  is_valid: boolean;
  validation_status: ReadingValidationStatus;
  extracted_reading: number | null;
  ocr_status: OcrStatus | null;
  ocr_payload: Record<string, unknown> | null;
  ocr_provider: string | null;
  ocr_confirmed_at: string | null;
  source: OdometerSource;
  created_at: string;
  updated_at: string;
};

export type OdometerRevision = {
  id: string;
  reading_id: string;
  user_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  reason: string;
  source: RevisionSource;
  created_at: string;
};

export type DistanceSegment = {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_reading_id: string;
  end_reading_id: string;
  distance: number;
  unit: DistanceUnit;
  started_on: string;
  ended_on: string;
  purpose: string;
  business_distance: number | null;
};

export type DailyMileage = {
  date: string;
  vehicle_id: string;
  start: OdometerReading | null;
  end: OdometerReading | null;
  distance: number | null;
  unit: DistanceUnit;
  complete: boolean;
  warnings: Array<'missing_end' | 'missing_start' | 'invalid_reading'>;
};

export type ProposedReading = {
  reading: number;
  unit: DistanceUnit;
  recorded_on: string;
  recorded_at: string;
};

export type ReadingEvaluation = {
  status: ReadingValidationStatus;
  is_valid: boolean;
  distance: number | null;
  previous?: OdometerReading;
  reason?: 'first' | 'lower_than_previous';
};
