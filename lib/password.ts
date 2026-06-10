import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const PREFIX = "scrypt";

function deriveKey(
  password: string,
  salt: Buffer,
  cost = COST,
  blockSize = BLOCK_SIZE,
  parallelization = PARALLELIZATION
) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { N: cost, r: blockSize, p: parallelization },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      }
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt);

  return [
    PREFIX,
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64"),
    derivedKey.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, storedPassword: string) {
  const parts = storedPassword.split("$");

  if (parts.length !== 6 || parts[0] !== PREFIX) {
    const passwordBuffer = Buffer.from(password);
    const storedBuffer = Buffer.from(storedPassword);

    return (
      passwordBuffer.length === storedBuffer.length &&
      timingSafeEqual(passwordBuffer, storedBuffer)
    );
  }

  const [, cost, blockSize, parallelization, salt, storedKey] = parts;
  const storedKeyBuffer = Buffer.from(storedKey, "base64");
  const derivedKey = await deriveKey(
    password,
    Buffer.from(salt, "base64"),
    Number(cost),
    Number(blockSize),
    Number(parallelization)
  );

  return (
    derivedKey.length === storedKeyBuffer.length &&
    timingSafeEqual(derivedKey, storedKeyBuffer)
  );
}
