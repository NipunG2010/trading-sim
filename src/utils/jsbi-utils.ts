import JSBI from 'jsbi';

export function toJSBIAmount(amount: number): JSBI {
  return JSBI.BigInt(Math.round(amount * 1e9));
}

export function fromJSBIAmount(amount: JSBI): number {
  return Number(JSBI.divide(amount, JSBI.BigInt(1e9)));
}