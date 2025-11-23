import fs from "fs/promises";
import forge from 'node-forge';
// import path from 'path';
import winston from 'winston';

import { CERTS_DIRECTORY, CA_CERT_PATH, CA_DIR, CA_KEY_PATH } from '@sproot/sproot-common/dist/utility/Constants.js';

const pki = forge.pki;

export interface CACredentials {
  certPem: string;
  keyPem: string;
}

export interface DeviceCertificate {
  certPem: string;
  keyPem: string;
}

export class CertificateAuthority {
  #caCert?: forge.pki.Certificate
  #caKey?: forge.pki.PrivateKey
  #caKeyPem?: string
  #caCertPem?: string
  #logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.#logger = logger;
  }

  async initializeAsync(): Promise<void> {
    await fs.mkdir(CERTS_DIRECTORY, { recursive: true });
    await fs.mkdir(CA_DIR, { recursive: true });

    const [keyExists, certExists] = await Promise.all([
      !fs.stat(CA_KEY_PATH).catch(() => false),
      !fs.stat(CA_CERT_PATH).catch(() => false),
    ]);

    if (keyExists && certExists) {
      this.#logger.info('Loading existing CA credentials...');

      const [keyPem, certPem] = await Promise.all([
        fs.readFile(CA_KEY_PATH, 'utf-8'),
        fs.readFile(CA_CERT_PATH, 'utf-8'),
      ]);
      this.#caKey = pki.privateKeyFromPem(keyPem);
      this.#caCert = pki.certificateFromPem(certPem);
      this.#caKeyPem = keyPem;
      this.#caCertPem = certPem;
    } else {
      this.#logger.info('Generating new CA credentials...');

      const { certPem, keyPem } = await this.#generateCACredentialsAsync();
      this.#caKey = pki.privateKeyFromPem(keyPem);
      this.#caCert = pki.certificateFromPem(certPem);
      this.#caKeyPem = keyPem;
      this.#caCertPem = certPem;

      console.log(this.#caCertPem);
      console.log(this.#caKeyPem);
      console.log(this.#caKey);
      console.log(this.#caCert);
    }
  }

  // public signDeviceCertificate(deviceId: string): DeviceCertificate {
  //   const keys = pki.rsa.generateKeyPair(2048);
  //   const cert = pki.createCertificate();

  //   cert.publicKey = keys.publicKey;
  //   cert.serialNumber = Date.now().toString();
  //   cert.validity.notBefore = new Date();
  //   cert.validity.notAfter = new Date();
  //   cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);

    
  // }

  async #generateCACredentialsAsync(): Promise<CACredentials> {
    const keys = pki.rsa.generateKeyPair(2048);
    const cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = Date.now().toString();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

    const attrs = [
      { name: "commonName", value: "Sproot Local CA" },
      { name: "organizationName", value: "Sproot" },
      { name: "countryName", value: "US" },
    ];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([
      { name: "basicConstraints", cA: true },
      { name: "keyUsage", keyCertSign: true, digitalSignature: true, cRLSign: true },
      { name: "subjectKeyIdentifier" },
    ]);

    cert.sign(keys.privateKey, forge.md.sha256.create());

    const certPem = pki.certificateToPem(cert);
    const keyPem = pki.privateKeyToPem(keys.privateKey);

    await Promise.all([
      fs.writeFile(CA_KEY_PATH, keyPem, { mode: 0o600 }),
      fs.writeFile(CA_CERT_PATH, certPem, { mode: 0o600 })
    ]);

    return { keyPem: keyPem, certPem: certPem };
  }
}
