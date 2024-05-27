import { QueueCache } from "../QueueCache";

import { assert } from "chai";
import * as sinon from "sinon";
const sandbox = sinon.createSandbox();

describe("QueueCache.ts tests", function () {
  afterEach(() => {
    sandbox.restore();
  });

  describe("QueueCache class", function () {
    describe("constructor", function () {
      it("should create a new QueueCache object", function () {
        const queueCache = new QueueCache(10);
        assert.equal(queueCache.limit, 10);
        assert.equal(queueCache.cache.length, 0);
      });

      it("should create a new QueueCache object with a cache", function () {
        const cache = [1, 2, 3, 4, 5];
        const queueCache = new QueueCache(10, cache);
        assert.equal(queueCache.limit, 10);
        assert.equal(queueCache.cache.length, 5);
      });
    });

    describe("addData", function () {
      it("should add data to the cache", function () {
        const queueCache = new QueueCache(10);
        queueCache.addData(1);
        assert.equal(queueCache.cache.length, 1);
        assert.equal(queueCache.cache[0], 1);
      });

      it("should remove the oldest data when the cache is full", function () {
        const queueCache = new QueueCache(3, [1, 2, 3]);
        queueCache.addData(4);
        assert.equal(queueCache.cache.length, 3);
        assert.equal(queueCache.cache[0], 2);
        assert.equal(queueCache.cache[1], 3);
        assert.equal(queueCache.cache[2], 4);
      });
    });

    describe("clear", function () {
      it("should clear the cache", function () {
        const queueCache = new QueueCache(10, [1, 2, 3, 4, 5]);
        queueCache.clear();
        assert.equal(queueCache.cache.length, 0);
      });
    });

    describe("get", function () {
      it("should get the cache with limit and offset", function () {
        const queueCache = new QueueCache(10, [1, 2, 3, 4, 5]);

        assert.deepEqual(queueCache.get(), [1, 2, 3, 4, 5]);
        assert.deepEqual(queueCache.get(0, 3), [1, 2, 3]);
        assert.deepEqual(queueCache.get(2, 3), [3, 4, 5]);
        assert.deepEqual(queueCache.get(2, 8), [3, 4, 5]);
        assert.deepEqual(queueCache.get(undefined, 3), [1, 2, 3]);
        assert.deepEqual(queueCache.get(5, 3), []);
      });
    });
  });
});
