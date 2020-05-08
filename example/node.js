'use strict';
const metrics = require('@opentelemetry/metrics');
const { LightstepMetricExporter } = require('../build/src/');

const exporter = new LightstepMetricExporter(
  {
    service: 'test',
    tags: 'lightstep.service_name:ls-trace-js-testing-04-20,lightstep.access_token:TOKEN',
    url: 'https://ingest.staging.lightstep.com:443/metrics',
  },
);

const meter = new metrics.MeterProvider({
  exporter,
  interval: 5000,
}).getMeter('example-observer');

const counter = meter.createCounter('cpu', {
  monotonic: false,
  labelKeys: ['name'],
  description: 'CPU',
});

const cpuUser = counter.bind({ 'name': 'cpu.user' });
const cpuSys = counter.bind({ 'name': 'cpu.sys' });
const cpuUsage = counter.bind({ 'name': 'cpu.usage' });
const cpuTotal = counter.bind({ 'name': 'cpu.total' });

setInterval(() => {
  const cpu = Math.random();
  cpuUser.add(cpu / 10);
  cpuSys.add(cpu / 5);
  cpuUsage.add(cpu / 10 + cpu / 5);
  cpuTotal.add(cpu * 10);
}, 1000);
