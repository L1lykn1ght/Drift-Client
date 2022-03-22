import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"


export async function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms))
}

export function wrapInTx(instruction: TransactionInstruction): Transaction {
	return new Transaction().add(instruction)
}

export const clearingHouseProgramId = new PublicKey('dammHkt7jmytvbS3nHTxQNEcP59aE57nxwV21YdqEDN')


export const QUOTE_PRECISION = 10 ** 6


export const updateNumber = {
    ftx: {
        SOL: 0.005,
        BTC: 5,
        ETH: 0.5,
        LUNA: 0.005,
        AVAX: 0.005,
        BNB: 0.02,
        MATIC: 0.00001,
        ATOM: 0.001,
        DOT: 0.002,
        ADA: 0.00001,
        ALGO: 0.0002,
        FTT: 0.002
    },
    binance: {
        LUNA: 0.005
    }
}