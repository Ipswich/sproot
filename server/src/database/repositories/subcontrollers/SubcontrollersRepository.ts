import type { ISubcontrollersRepository } from "./ISubcontrollersRepository";
import { SDBSubcontroller } from "@sproot/common/database/SDBSubcontroller";
import { encrypt, decrypt } from "@sproot/common/utility/Crypto";
import { Knex } from "knex";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";
import {
  DeletionRequestResult,
  IDeletionQueueRepository,
} from "../deletion-queue/IDeletionQueueRepository";

export class SubcontrollersRepository
  extends BaseKnexRepository
  implements ISubcontrollersRepository
{
  constructor(connection: Knex) {
    super(connection);
  }

  async getAllAsync(): Promise<SDBSubcontroller[]> {
    const result = await this.connection("subcontrollers")
      .select("*")
      .where("pendingDeletion", false);
    result.forEach((device: SDBSubcontroller) => {
      device.secureToken =
        device.secureToken == null ? null : decrypt(device.secureToken, process.env["JWT_SECRET"]!);
    });
    return result;
  }

  async addAsync(subcontroller: SDBSubcontroller): Promise<number> {
    const copy = { ...subcontroller };
    copy.secureToken =
      copy.secureToken == null ? null : encrypt(copy.secureToken, process.env["JWT_SECRET"]!);
    return this.insertAndGetIdAsync("subcontrollers", copy);
  }

  async updateAsync(subcontroller: SDBSubcontroller): Promise<number> {
    return this.connection("subcontrollers")
      .where("id", subcontroller.id)
      .andWhere("pendingDeletion", false)
      .update({
        name: subcontroller.name,
        type: subcontroller.type,
        hostName: subcontroller.hostName,
      });
  }

  async deleteAsync(id: number): Promise<number> {
    return this.connection("subcontrollers").where("id", id).delete();
  }

  async requestDeletionAsync(
    id: number,
    deletionQueueRepository: IDeletionQueueRepository,
  ): Promise<DeletionRequestResult> {
    return this.connection.transaction(async (trx) => {
      const updatedRows = await trx("subcontrollers")
        .where("id", id)
        .andWhere("pendingDeletion", false)
        .update({
          pendingDeletion: true,
          pendingDeletionStartedAt: this.getCurrentTimestampValue(),
        })
        .returning<{ id: number }[]>("id");

      if (updatedRows.length > 0) {
        await deletionQueueRepository.enqueueAsync(trx, "subcontroller", id);
        return "queued";
      }

      const existingRow = await trx("subcontrollers")
        .select("pendingDeletion")
        .where("id", id)
        .first();
      return existingRow ? "already-pending" : "not-found";
    });
  }

  async requestChildDeletionsAsync(
    id: number,
    deletionQueueRepository: IDeletionQueueRepository,
  ): Promise<{
    outputIds: number[];
    sensorIds: number[];
    remainingOutputCount: number;
    remainingSensorCount: number;
  }> {
    return this.connection.transaction(async (trx) => {
      const outputRows = await trx("outputs")
        .select<{ id: number }[]>("id")
        .where("subcontroller_id", id)
        .andWhere("pendingDeletion", false)
        .orderBy("id", "asc");
      const sensorRows = await trx("sensors")
        .select<{ id: number }[]>("id")
        .where("subcontroller_id", id)
        .andWhere("pendingDeletion", false)
        .orderBy("id", "asc");

      const outputIds = outputRows.map((row) => row.id);
      const sensorIds = sensorRows.map((row) => row.id);
      const pendingDeletionStartedAt = this.getCurrentTimestampValue();

      if (outputIds.length > 0) {
        await trx("outputs").whereIn("id", outputIds).update({
          pendingDeletion: true,
          pendingDeletionStartedAt,
        });
        await deletionQueueRepository.enqueueManyAsync(
          trx,
          outputIds.map((entityId) => ({ entityType: "output" as const, entityId })),
        );
      }

      if (sensorIds.length > 0) {
        await trx("sensors").whereIn("id", sensorIds).update({
          pendingDeletion: true,
          pendingDeletionStartedAt,
        });
        await deletionQueueRepository.enqueueManyAsync(
          trx,
          sensorIds.map((entityId) => ({ entityType: "sensor" as const, entityId })),
        );
      }

      const remainingOutputs = await trx("outputs")
        .count<{ count: number | string }[]>("* as count")
        .where("subcontroller_id", id)
        .first();
      const remainingSensors = await trx("sensors")
        .count<{ count: number | string }[]>("* as count")
        .where("subcontroller_id", id)
        .first();

      return {
        outputIds,
        sensorIds,
        remainingOutputCount: Number(remainingOutputs?.count ?? 0),
        remainingSensorCount: Number(remainingSensors?.count ?? 0),
      };
    });
  }

  async finalizePendingDeletionAsync(id: number): Promise<number> {
    return this.connection("subcontrollers")
      .where("id", id)
      .andWhere("pendingDeletion", true)
      .delete();
  }
}
