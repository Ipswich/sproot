import fs from "fs";
import { assert } from "chai";
import { get as httpGet } from "http";
import sinon from "sinon";
import request from "supertest";

import { app, server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";
import { CameraManager } from "../../../camera/CameraManager";
import { FrameBuffer } from "../../../camera/FrameBuffer";

describe("Camera Routes", async function () {
  this.timeout(2000);

  const cameraSettingsKeys = [
    "id",
    "enabled",
    "name",
    "xVideoResolution",
    "yVideoResolution",
    "videoFps",
    "xImageResolution",
    "yImageResolution",
    "timelapseEnabled",
    "imageRetentionDays",
    "imageRetentionSize",
    "timelapseInterval",
    "timelapseStartTime",
    "timelapseEndTime",
  ];

  describe("Settings", () => {
    describe("GET", () => {
      it("should return 200 and camera settings data", async () => {
        const response = await request(server).get("/api/v2/camera/settings").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.deepEqual(content.data, {
          id: 1,
          enabled: false,
          name: "Pi Camera",
          xVideoResolution: null,
          yVideoResolution: null,
          videoFps: null,
          xImageResolution: null,
          yImageResolution: null,
          imageRetentionDays: 90,
          imageRetentionSize: 5000,
          timelapseEnabled: false,
          timelapseInterval: 5,
          timelapseStartTime: null,
          timelapseEndTime: null,
        });
      });
    });

    describe("PATCH", () => {
      it("should return 200 and the updated settings", async () => {
        assert.equal(app.get("cameraManager").cameraSettings.name, "Pi Camera");

        const updatedSettings = {
          enabled: true,
          name: "Updated Camera Name",
          xVideoResolution: 1280,
          yVideoResolution: 720,
          videoFps: 30,
          xImageResolution: 1920,
          yImageResolution: 1080,
          timelapseEnabled: true,
          imageRetentionDays: 7,
          imageRetentionSize: 1024,
          timelapseInterval: 60,
          timelapseStartTime: "08:00",
          timelapseEndTime: "20:00",
        };

        const response = await request(server)
          .patch("/api/v2/camera/settings")
          .send(updatedSettings)
          .expect(200);

        const content = response.body["content"];
        validateMiddlewareValues(response);

        assert.containsAllKeys(content.data, cameraSettingsKeys);
        assert.equal(app.get("cameraManager").cameraSettings.name, "Updated Camera Name");
      });
    });
  });

  describe("Stream", () => {
    describe("GET", () => {
      it("should return 200 and a stream", async () => {
        const cameraManager = app.get("cameraManager") as CameraManager;
        const frameBuffer = new FrameBuffer({ logger: app.get("logger") });
        const getFrameBufferStub = sinon.stub(cameraManager, "getFrameBuffer").returns(frameBuffer);

        try {
          await new Promise<void>((resolve, reject) => {
            let settled = false;
            const req = httpGet("http://127.0.0.1:3000/api/v2/camera/stream", (res) => {
              try {
                assert.equal(res.statusCode, 200);
                assert.equal(
                  res.headers["content-type"],
                  "multipart/x-mixed-replace; boundary=FRAME"
                );
              } catch (error) {
                clearTimeout(timeout);
                settled = true;
                req.destroy();
                reject(error);
                return;
              }

              res.once("data", () => {
                if (settled) {
                  return;
                }
                settled = true;
                clearTimeout(timeout);
                req.destroy();
                resolve();
              });
              res.once("error", (streamError: Error) => {
                if (settled) {
                  return;
                }
                settled = true;
                clearTimeout(timeout);
                clearInterval(waitForSubscriberInterval);
                req.destroy();
                reject(streamError);
              });
            });
            const timeout = setTimeout(() => {
              if (settled) {
                return;
              }
              settled = true;
              clearInterval(waitForSubscriberInterval);
              req.destroy();
              reject(new Error("Stream did not send data within timeout period"));
            }, 300);
            const waitForSubscriberInterval = setInterval(() => {
              if (settled || frameBuffer.getSubscriberCount() === 0) {
                return;
              }

              clearInterval(waitForSubscriberInterval);
              frameBuffer.getStream().write(Buffer.from("test-stream-chunk"));
            }, 5);

            req.on("error", (err) => {
              if (
                settled &&
                (err.message.includes("aborted") || err.message.includes("socket hang up"))
              ) {
                return;
              }
              if (!settled) {
                settled = true;
                clearTimeout(timeout);
                clearInterval(waitForSubscriberInterval);
                reject(err);
              }
            });
          });
        } finally {
          getFrameBufferStub.restore();
        }
      });

      it("should return a 200 after reconnecting to the livestream server", async () => {
        const cameraManager = app.get("cameraManager") as CameraManager;
        const reconnectStub = sinon.stub(cameraManager, "reconnectLivestreamAsync").resolves(true);

        try {
          const response = await request(server).post("/api/v2/camera/reconnect").expect(200);

          validateMiddlewareValues(response);
          assert.isTrue(reconnectStub.calledOnce);
          assert.equal(response.body.content.data, "Livestream successfully reconnected");
        } finally {
          reconnectStub.restore();
        }
      });
    });
  });

  describe("Latest Image", () => {
    describe("GET", () => {
      it("should return 200 and the latest image", async () => {
        const response = await request(server).get("/api/v2/camera/latest-image").expect(200);
        validateMiddlewareValues(response);
        assert.equal(response.headers["content-type"], "image/jpeg");
        assert.isNotNull(response.body);
      });
    });
  });

  describe("Timelapse", () => {
    describe("Archive", () => {
      describe("GET", () => {
        it("should return 200 and the archive file", async () => {
          const response = await request(server).get("/api/v2/camera/timelapse/archive").expect(200);
          validateMiddlewareValues(response);
          assert.equal(response.headers["content-type"], "application/x-tar");
          assert.isNotNull(response.body);
        });
      });
    });

    describe("Regenerate", () => {
      describe("POST", () => {
        it("should return 202 and queue archive regeneration", async () => {
          const response = await request(server)
            .post("/api/v2/camera/timelapse/archive/regenerate")
            .expect(202);
          validateMiddlewareValues(response);
          assert.equal(response.body["content"].data, "Timelapse archive regeneration queued.");
        });
      });
    });

    describe("Status", async () => {
      describe("GET", async () => {
        it("should return 200 and the timelapse generation status", async () => {
          const response = await request(server)
            .get("/api/v2/camera/timelapse/archive/status")
            .expect(200);
          validateMiddlewareValues(response);
          assert.isBoolean(response.body["content"].data.isGenerating);
          assert.isNumber(response.body["content"].data.archiveProgress);
        });
      });
    });

    describe("Clear All Images", () => {
      describe("DELETE", () => {
        it("should return 200 and clear all timelapse images", async () => {
          let attempts = 0;
          while (
            (app.get("cameraManager") as CameraManager).getTimelapseArchiveProgress().isGenerating &&
            attempts < 5
          ) {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          let imageCount = await fs.promises.readdir("images/timelapse");
          assert.isAbove(imageCount.length, 0, "There should be images to clear for this test");
          const response = await request(server).delete("/api/v2/camera/timelapse/images").expect(200);
          validateMiddlewareValues(response);
          imageCount = await fs.promises.readdir("images/timelapse");
          assert.equal(imageCount.length, 0, "All images should be cleared");
          assert.equal(response.body["content"].data, "All images cleared successfully");
        });
      });
    });
  });
});