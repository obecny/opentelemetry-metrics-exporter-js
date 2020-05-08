const Url = require('url-parse');
import * as metrics from '@opentelemetry/metrics';
import * as http from 'http';
import * as https from 'https';
import { toIngestRequest } from './transform';
import { SendError, SendOptions } from './types';
import * as metricProto from './typesProto';

export function sendMetrics(
  records: metrics.MetricRecord[],
  metricsUrl: string,
  options: SendOptions,
  onSuccess: (message?: string) => void,
  onError: (error: SendError) => void
) {
  const ingestRequest = toIngestRequest(records, options);
  sendUsingHttp(ingestRequest, metricsUrl, options, onSuccess, onError);
  // just keep temporary for testing purposes
  // sendUsingRequest(ingestRequest, metricsUrl, options, onSuccess, onError);
}

export function sendUsingHttp(
  ingestRequest: metricProto.IngestRequest,
  metricsUrl: string,
  sendOptions: SendOptions,
  onSuccess: (message?: string) => void,
  onError: (error: SendError) => void
) {
  const url = new Url(metricsUrl);
  const body = JSON.stringify(ingestRequest);

  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Lightstep-Access-Token': sendOptions.accessToken,
    },
  };

  const request = url.protocol === 'http:' ? http.request : https.request;

  const req = request(options, res => {
    if (res.statusCode && res.statusCode < 300) {
      onSuccess(`${ingestRequest.points.length} metric(s) sent`);
    } else {
      onError({
        message: res.statusMessage,
        status: res.statusCode,
      });
    }
  });

  req.on('error', error => {
    onError({
      message: error.message,
    });
  });
  req.write(body);
  req.end();
}

// const request = require('request');
// export function sendUsingRequest(
//   ingestRequest: metricProto.IngestRequest,
//   metricsUrl: string,
//   sendOptions: SendOptions,
//   onSuccess: (message?: string) => void,
//   onError: (error: SendError) => void
// ) {
//   // const text = JSON.stringify(ingestRequest);
//   const options = {
//     json: true,
//     url: metricsUrl,
//     headers: {
//       'Lightstep-Access-Token': sendOptions.accessToken,
//     },
//     body: ingestRequest,
//   };
//
//   request.post(options, function(error: any, response: any, body: any) {
//     if (response.statusCode === 200) {
//       onSuccess(`${ingestRequest.points.length} metric(s) sent`);
//     } else {
//       onError({
//         message: JSON.stringify(body),
//         status: response.statusCode,
//       });
//       console.log(!!ingestRequest);
//     }
//   });
// }
