// import { Client, Plug } from "tplink-smarthome-api"
// import { OutputBase } from "./base/OutputBase";
// import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
// import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
// import winston from "winston";
// import { MultiOutputBase } from "./base/MultiOutputBase";

// class HS300 extends MultiOutputBase{
//   #client: Client;

//   constructor(
//     sprootDB: ISprootDB,
//     maxCacheSize: number,
//     initialCacheLookback: number,
//     maxChartDataSize: number,
//     chartDataPointInterval: number,
//     logger: winston.Logger
//   ) {
//     super(sprootDB, maxCacheSize, initialCacheLookback, maxChartDataSize, chartDataPointInterval, undefined, logger)
//     this.#client = new Client({ defaultSendOptions: { timeout: 500, transport: 'tcp' } })
//   }

//   async createOutputAsync(output: SDBOutput): Promise<OutputBase | undefined> {
//     //Create new HS300 if one doesn't exist for this address.
//     if (!this.boardRecord[output.address]) {
//       this.boardRecord[output.address] = await this.#client.getDevice({ host: output.address }) as Plug
//       this.usedPins[output.address] = [];
//     }

//     const hs300 = await this.#client.getDevice({ host: output.address, childId: output.pin })
//     this.outputs[output.id] = new HS300Output(
//       hs300 as Plug,
//       output,
//       this.sprootDB,
//       this.maxCacheSize,
//       this.initialCacheLookback,
//       this.maxChartDataSize,
//       this.chartDataPointInterval,
//       this.logger,
//     );
//     await this.outputs[output.id]?.initializeAsync();
//     this.usedPins[output.address]?.push(output.pin);
//     return this.outputs[output.id];
//   }

//   async getAvailableChildIds(host: string): Promise<string[]> {
//     const device = await this.#client.getDevice({host}) as Plug
//     const childIds = device.children ? [...device.children.keys()] : []
//     return childIds.filter(childId => !this.usedPins[host]?.includes(childId));
//   }

//   async getAvailableHosts(){
    
//   }
// }

// class HS300Output extends OutputBase {
//   hs300: Plug;

//   constructor(
//     hs300: Plug,
//     output: SDBOutput,
//     sprootDB: ISprootDB,
//     maxCacheSize: number,
//     initialCacheLookback: number,
//     maxChartDataSize: number,
//     chartDataPointInterval: number,
//     logger: winston.Logger,
//   ) {
//     super(
//       output,
//       sprootDB,
//       maxCacheSize,
//       initialCacheLookback,
//       maxChartDataSize,
//       chartDataPointInterval,
//       logger,
//     );
//     this.hs300 = hs300;
//   }

//   executeState(): void {
//     this.executeStateHelper((value) => {
//       this.hs300.setPowerState(!!value);
//     });
//   }

//   dispose = () => {
//     this.hs300.setPowerState(false);
//   };
// }

// export { HS300, HS300Output };
