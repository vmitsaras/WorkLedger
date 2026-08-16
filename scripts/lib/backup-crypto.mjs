import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, readFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

const MAGIC = Buffer.from('WLBAK001');
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export async function readSecretFile(path) {
  const value = (await readFile(path, 'utf8')).trim();
  if (Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error('Backup encryption secret must contain at least 32 bytes.');
  }
  return value;
}

export async function encryptBackup(inputPath, outputPath, secret) {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', scryptSync(secret, salt, KEY_BYTES), iv);
  const output = createWriteStream(outputPath, { flags: 'wx', mode: 0o600 });
  output.write(Buffer.concat([MAGIC, salt, iv]));
  await pipeline(createReadStream(inputPath), cipher, output, { end: false });
  output.end(cipher.getAuthTag());
  await new Promise((resolve, reject) => {
    output.once('close', resolve);
    output.once('error', reject);
  });
}

export async function decryptBackup(inputPath, outputPath, secret) {
  const file = await open(inputPath, 'r');
  try {
    const { size } = await file.stat();
    const headerSize = MAGIC.length + SALT_BYTES + IV_BYTES;
    if (size <= headerSize + TAG_BYTES) throw new Error('Encrypted backup is truncated.');
    const header = Buffer.alloc(headerSize);
    const tag = Buffer.alloc(TAG_BYTES);
    await file.read(header, 0, header.length, 0);
    await file.read(tag, 0, tag.length, size - TAG_BYTES);
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) {
      throw new Error('Encrypted backup format is not recognized.');
    }
    const salt = header.subarray(MAGIC.length, MAGIC.length + SALT_BYTES);
    const iv = header.subarray(MAGIC.length + SALT_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', scryptSync(secret, salt, KEY_BYTES), iv);
    decipher.setAuthTag(tag);
    await pipeline(
      createReadStream(inputPath, { start: headerSize, end: size - TAG_BYTES - 1 }),
      decipher,
      createWriteStream(outputPath, { flags: 'wx', mode: 0o600 }),
    );
  } finally {
    await file.close();
  }
}
