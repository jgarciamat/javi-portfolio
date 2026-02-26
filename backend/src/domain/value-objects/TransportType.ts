export type TransportTypeValue = 'PLANE' | 'TRUCK' | 'VAN';

export class TransportType {
  private readonly _value: TransportTypeValue;

  private constructor(value: TransportTypeValue) {
    this._value = value;
  }

  static create(value: string): TransportType {
    if (!value || value.trim() === '') {
      throw new Error('Transport type cannot be empty');
    }

    const upperValue = value.toUpperCase();
    
    if (!this.isValidTransportType(upperValue)) {
      throw new Error(`Invalid transport type: ${value}`);
    }

    return new TransportType(upperValue as TransportTypeValue);
  }

  private static isValidTransportType(value: string): value is TransportTypeValue {
    return ['PLANE', 'TRUCK', 'VAN'].includes(value);
  }

  get value(): TransportTypeValue {
    return this._value;
  }

  isPlane(): boolean {
    return this._value === 'PLANE';
  }

  isTruck(): boolean {
    return this._value === 'TRUCK';
  }

  isVan(): boolean {
    return this._value === 'VAN';
  }

  equals(other: TransportType): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
