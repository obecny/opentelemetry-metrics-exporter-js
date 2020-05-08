// import { HrTime } from '@opentelemetry/api';

export interface IngestRequest {
  idempotencyKey: string;
  reporter?: Reporter;
  points: MetricPoint[];
}

export interface KeyValue {
  key: string;
  stringValue?: string;
  intValue?: string;
  doubleValue?: number;
  boolValue?: boolean;
  jsonValue?: string;
}

export interface MetricPoint {
  kind: MetricKind;
  metricName: string;
  start?: Timestamp;
  duration?: Duration;
  labels: KeyValue[];
  // uint64Value: number,
  doubleValue: number;
}

export enum MetricKind {
  INVALID_METRIC_KIND = 0,
  COUNTER = 1,
  GAUGE = 2,
}

export interface Reporter {
  reporterId?: string;
  tags: KeyValue[];
}

export type Timestamp = string;
export type Duration = string;
// export interface Timestamp {
//   seconds: number;
//   nanos: number;
// }
