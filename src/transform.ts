import { HrTime } from '@opentelemetry/api';
import * as os from 'os';
import * as core from '@opentelemetry/core';
import * as metrics from '@opentelemetry/metrics';
import { getRandomKey } from './utils';
import { LabelWithName, SendOptions } from './types';
import * as metricProto from './typesProto';

/**
 * Transform metric kind into metricProto kind
 * @param kind
 */
export function toKind(kind: metrics.MetricKind): metricProto.MetricKind {
  if (kind === metrics.MetricKind.COUNTER) {
    return metricProto.MetricKind.COUNTER;
  } else if (kind === metrics.MetricKind.OBSERVER) {
    return metricProto.MetricKind.GAUGE;
  }
  return metricProto.MetricKind.INVALID_METRIC_KIND;
}

/**
 * Transforms Metric Record into Metric Point
 * @param record
 * @param options
 */
export function toMetricPoint(
  record: metrics.MetricRecord,
  options: SendOptions
): metricProto.MetricPoint {
  const recordLabels = (Object.assign(
    {},
    record.labels
  ) as unknown) as LabelWithName;
  const metricName = options.metricNameConverter(recordLabels.name);
  delete recordLabels.name;

  const aggPoint = record.aggregator.toPoint();

  // console.log(metricName, aggPoint.value, JSON.stringify(recordLabels));

  const start = toTimeStamp(aggPoint.timestamp);
  let duration: metricProto.Duration;
  if (record.descriptor.metricKind === metrics.MetricKind.COUNTER) {
    const hrDuration = core.hrTimeDuration(
      options.lastTime,
      aggPoint.timestamp
    );
    duration = toDuration(hrDuration);
  } else {
    duration = toDuration([0, 0]);
  }

  options.tags.forEach(tag => {
    const arr = tag.split(':');
    recordLabels[arr[0]] = arr[1];
  });

  const labels: metricProto.KeyValue[] = [];
  Object.keys(recordLabels).forEach(key => {
    labels.push(NewKeyValue(key, recordLabels[key]));
  });

  return {
    doubleValue: aggPoint.value as number,
    duration,
    kind: toKind(record.descriptor.metricKind),
    labels,
    metricName,
    start,
  };
}

/**
 * Transforms hrTime to timestamp
 * @param hrTime
 */
export function toTimeStamp(hrTime: HrTime): metricProto.Timestamp {
  return String(core.hrTimeToTimeStamp(hrTime));
}

/**
 * Transforms hrTime into duration
 * @param hrTime
 */
export function toDuration(hrTime: HrTime): metricProto.Duration {
  const durationS: number = hrTime[0];
  const durationN: number = hrTime[1];
  if (durationS > 0) {
    return `${durationS}s${durationN}ns`;
  } else if (durationN > 0) {
    return `${durationN}ns`;
  } else {
    return '0';
  }
}

/**
 * Transforms records into Ingest Request
 * @param records
 * @param options
 */
export function toIngestRequest(
  records: metrics.MetricRecord[],
  options: SendOptions
): metricProto.IngestRequest {
  const points: metricProto.MetricPoint[] = records
    .filter(record => {
      const point = record.aggregator.toPoint();
      return (
        typeof point.value !== 'undefined' &&
        core.hrTimeToNanoseconds(point.timestamp) > 0
      );
    })
    .map(record => toMetricPoint(record, options));

  return {
    idempotencyKey: getRandomKey(30),
    points: points,
    reporter: getReporter(options.serviceName),
  };
}

/**
 * Get proto reporter
 * @param serviceName
 */
function getReporter(serviceName: string): metricProto.Reporter {
  return {
    // reporterId: getRandomKey(30),
    tags: [
      NewKeyValue('lightstep.component_name', serviceName),
      NewKeyValue('lightstep.hostname', os.hostname()),
      // NewKeyValue('lightstep.reporter_platform', 'ls-trace-js'),
      NewKeyValue('lightstep.reporter_platform', 'opentelemetry-js'),
      NewKeyValue('lightstep.reporter_platform_version', process.version),
    ],
  };
}

/**
 * Create a Key Value pair in proto format
 * @param key
 * @param value
 * @constructor
 */
function NewKeyValue(key: string, value: any): metricProto.KeyValue {
  const keyValue: metricProto.KeyValue = {
    key,
  };
  if (typeof value === 'string') {
    keyValue.stringValue = String(value);
  }
  return keyValue;
}

/**
 * Extract value from tags by key
 * @param key
 * @param tags
 */
export function valueFromTags(key: string, tags: string[]): string {
  for (const tag of tags) {
    if (tag.startsWith(`${key}:`)) return tag.split(':')[1];
  }
  return '';
}
