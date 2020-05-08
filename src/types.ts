import * as api from '@opentelemetry/api';

export interface LabelWithName {
  name: string;

  [key: string]: string;
}

export type MetricNameConverter = (metricName: string) => string;

export function NoopMetricNameConverter<MetricNameConverter>(
  metricName: string
): string {
  return metricName;
}

export interface SendError {
  message?: string;
  status?: number;
}

export interface SendOptions {
  metricNameConverter: MetricNameConverter;
  lastTime: api.HrTime;
  tags: string[];
  accessToken: string;
  serviceName: string;
}
