import * as assert from 'assert';
import * as os from 'os';
import * as sinon from 'sinon';
import * as http from 'http';
import * as metrics from '@opentelemetry/metrics';
import { LightstepMetricExporter } from '../src';
import { IngestRequest } from '../src/typesProto';

const mockJson = require('./mock.json');

const fakeRequest = {
  end: function() {},
  on: function() {},
  write: function() {},
};

describe('LightstepMetricExporter', () => {
  let exporter: LightstepMetricExporter;
  let sandbox: sinon.SinonSandbox;
  let spyRequest: any;
  let spyWrite: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.useFakeTimers();

    sandbox.stub(process, 'version').value('v12.12.0');
    sandbox.stub(os, 'hostname').returns('local.computer');
    spyRequest = sandbox.stub(http, 'request').returns(fakeRequest as any);
    spyWrite = sandbox.stub(fakeRequest, 'write');

    exporter = new LightstepMetricExporter({
      tags:
        'lightstep.service_name:ls-trace-js-testing,lightstep.access_token:123',
      url: 'http://127.0.0.1',
    });
    const meter = new metrics.MeterProvider({
      exporter,
      interval: 5000,
    }).getMeter('example-observer');

    const counter = meter.createCounter('cpu', {
      monotonic: false,
      labelKeys: ['name'],
      description: 'CPU',
    });

    const observer = meter.createObserver('mem', {
      monotonic: false,
      labelKeys: ['name'],
      description: 'Memory',
    }) as metrics.ObserverMetric;

    function memT() {
      return 1024;
    }

    function memA() {
      return 765;
    }

    observer.setCallback(observerResult => {
      observerResult.observe(memA, { name: 'mem.available' });
      observerResult.observe(memT, { name: 'mem.total' });
    });

    const cpuUser = counter.bind({ name: 'cpu.user' });
    const cpuSys = counter.bind({ name: 'cpu.sys' });

    const cpu = 0.2;
    cpuUser.add(cpu / 10);
    cpuSys.add(cpu / 5);
  });
  afterEach(() => {
    sandbox.restore();
    spyRequest.restore();
    spyWrite.restore();
  });

  it('should create an instance', () => {
    assert.ok(exporter instanceof LightstepMetricExporter);
  });

  it('should export "cpu.user" counter', () => {
    sandbox.clock.tick(5000);
    const body = spyWrite.args[0][0];
    let json: IngestRequest | undefined;
    try {
      json = JSON.parse(body);
    } catch (e) {}
    assert.ok(typeof json !== 'undefined');
    if (json) {
      json.points[0].start = mockJson.points[0].start;
      assert.deepStrictEqual(json.points[0], mockJson.points[0]);
    }
  });

  it('should export "cpu.sys" counter', () => {
    sandbox.clock.tick(5000);
    const body = spyWrite.args[0][0];
    let json: IngestRequest | undefined;
    try {
      json = JSON.parse(body);
    } catch (e) {}
    assert.ok(typeof json !== 'undefined');
    if (json) {
      json.points[1].start = mockJson.points[1].start;
      assert.deepStrictEqual(json.points[1], mockJson.points[1]);
    }
  });

  it('should export "mem.available" observer', () => {
    sandbox.clock.tick(5000);
    const body = spyWrite.args[0][0];
    let json: IngestRequest | undefined;
    try {
      json = JSON.parse(body);
    } catch (e) {}
    assert.ok(typeof json !== 'undefined');
    if (json) {
      json.points[2].start = mockJson.points[2].start;
      assert.deepStrictEqual(json.points[2], mockJson.points[2]);
    }
  });

  it('should export "mem.total" observer', () => {
    sandbox.clock.tick(5000);
    const body = spyWrite.args[0][0];
    let json: IngestRequest | undefined;
    try {
      json = JSON.parse(body);
    } catch (e) {}
    assert.ok(typeof json !== 'undefined');
    if (json) {
      json.points[3].start = mockJson.points[3].start;
      assert.deepStrictEqual(json.points[3], mockJson.points[3]);
    }
  });

  it('exported json should have reporter', () => {
    sandbox.clock.tick(5000);
    const body = spyWrite.args[0][0];
    let json: IngestRequest | undefined;
    try {
      json = JSON.parse(body);
    } catch (e) {}
    assert.ok(typeof json !== 'undefined');
    if (json) {
      assert.deepStrictEqual(json.reporter, mockJson.reporter);
    }
  });
});
