import { ExportResult } from '@opentelemetry/base';
import * as api from '@opentelemetry/api';
import * as core from '@opentelemetry/core';
import * as metrics from '@opentelemetry/metrics';

import { sendMetrics } from './sendMetrics';
import { valueFromTags } from './transform';
import { MetricNameConverter, NoopMetricNameConverter } from './types';

const DEFAULT_SERVICE_NAME = 'opentelemetry-exporter-metric-js-default';
const DEFAULT_URL = 'https://ingest.staging.lightstep.com/metrics';
const LIGHTSTEP_ACCESS_TOKEN_TAG = 'lightstep.access_token';
const LIGHTSTEP_SERVICE_NAME_TAG = 'lightstep.service_name';

/**
 * Configuration
 */
export interface LightstepMetricExporterConfig {
  logger?: api.Logger;
  metricNameConverter?: MetricNameConverter;
  tags?: string;
  url?: string;
}

export class LightstepMetricExporter implements metrics.MetricExporter {
  private readonly _tags: string[];
  private _isShutdown: boolean = false;
  private readonly _accessToken: string;
  private readonly _serviceName: string;
  private readonly _url: string;
  readonly logger: api.Logger;
  private _lastTime: api.HrTime = core.hrTime();
  private readonly _metricNameConverter: MetricNameConverter;

  constructor(config: LightstepMetricExporterConfig = {}) {
    this.logger = config.logger || new core.NoopLogger();
    this._tags = (config.tags || '').split(',');
    this._accessToken = valueFromTags(LIGHTSTEP_ACCESS_TOKEN_TAG, this._tags);
    this._serviceName =
      valueFromTags(LIGHTSTEP_SERVICE_NAME_TAG, this._tags) ||
      DEFAULT_SERVICE_NAME;
    this._url = config.url || DEFAULT_URL;
    this._metricNameConverter =
      config.metricNameConverter || NoopMetricNameConverter;
  }

  _exportMetrics(records: metrics.MetricRecord[]) {
    return new Promise((resolve, reject) => {
      try {
        this.logger.debug('metrics to be sent', records);
        sendMetrics(
          records,
          this._url,
          {
            metricNameConverter: this._metricNameConverter,
            lastTime: this._lastTime,
            tags: this._tags,
            accessToken: this._accessToken,
            serviceName: this._serviceName,
          },
          resolve,
          reject
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  export(
    records: metrics.MetricRecord[],
    resultCallback: (result: ExportResult) => void
  ) {
    if (this._isShutdown) {
      resultCallback(ExportResult.FAILED_NOT_RETRYABLE);
      return;
    }
    const lastTime = core.hrTime();
    this._exportMetrics(records)
      .then(message => {
        this._lastTime = lastTime;
        console.log('success', message, new Date().toISOString());
        resultCallback(ExportResult.SUCCESS);
      })
      .catch(error => {
        console.log('error', error.message, new Date().toISOString());
        if (error.message) {
          this.logger.error(error.message);
        }
        if (error.code && error.code < 500) {
          resultCallback(ExportResult.FAILED_NOT_RETRYABLE);
        } else {
          resultCallback(ExportResult.FAILED_RETRYABLE);
        }
      });
  }

  shutdown() {
    if (this._isShutdown) {
      this.logger.debug('shutdown already started');
      return;
    }
    this._isShutdown = true;
    this.logger.debug('shutdown started');
  }
}
