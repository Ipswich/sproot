import { Bonjour, Browser, Service } from "bonjour-service";
import winston from "winston";

import { MDNS_SERVICE_TYPE } from "@sproot/sproot-common/dist/utility/Constants";

export class MdnsService implements Disposable {
  readonly #bonjour: Bonjour = new Bonjour();
  readonly #browser: Browser;
  readonly #logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.#logger = logger;

    this.#browser = this.#bonjour.find({ type: MDNS_SERVICE_TYPE }, (service) => {
      this.#logger.info("Discovered MDNS service:", {
        name: service.name,
        type: service.type,
        host: service.host,
        port: service.port,
        addresses: service.addresses,
      });
    });
    this.#browser.services;
  }

  get services(): Service[] {
    return this.#browser.services;
  }

  get devices(): { name: string; host: string; address: string | string[] }[] {
    const record: { name: string; host: string; address: string | string[] }[] = [];
    for (const service of this.#browser.services) {
      if (!service.addresses || service.addresses.length === 0) {
        continue;
      }
      const host = service.host;
      const address = service.addresses.length === 1 ? service.addresses[0]! : service.addresses;
      record.push({ name: service.name, host, address });
    }
    return record;
  }

  [Symbol.dispose](): void {
    this.#browser.stop();
    this.#bonjour.destroy();
  }
}
