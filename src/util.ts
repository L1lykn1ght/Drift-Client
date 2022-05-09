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
        SOL: 0.01,
        BTC: 1,
        ETH: 0.1,
        LUNA: 0.005,
        AVAX: 0.01,
        BNB: 0.01,
        MATIC: 0.0001,
        ATOM: 0.001,
        DOT: 0.001,
        ADA: 0.0001,
        ALGO: 0.0001,
        FTT: 0.001,
        LTC: 0.01,
        XRP: 0.0001,
        APE: 0.001,
        DOGE: 0.00001,
        NEAR: 0.001,
        SRM: 0.001,
        GMT: 0.0001,
        CRV: 0.001,
        FTM: 0.0001
    }
}