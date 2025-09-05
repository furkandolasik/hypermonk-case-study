// 4 byte timestamp (Epoch from 2000)
// 1 byte counter
// 1 byte random value
export default class IdGenerator {
  counter = 0;
  private constructor() {
    this.counter = 0;
  }

  static create() {
    return new IdGenerator();
  }

  generate(): Buffer {
    const timestamp = Math.floor(Date.now() / 1000 - 946684800);
    const counter = this.counter++;
    const random = Math.floor(Math.random() * 256);

    const buffer = Buffer.alloc(6);
    buffer.writeUInt32BE(timestamp, 0);
    buffer.writeUInt8(counter % 256, 4);
    buffer.writeUInt8(random % 256, 5);

    return buffer;
  }

  generateHex(): string {
    return this.generate().toString('hex');
  }
}
