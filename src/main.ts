require('dotenv').config()
import { Keypair } from "@solana/web3.js"
import { Wallet } from "@drift-labs/sdk"
import { ArbClient } from "./driftClient"
import { binanceusdm } from "ccxt"


const keypair = Keypair.fromSecretKey(
	Uint8Array.from(JSON.parse(process.env.secretKey))
)

const wallet = new Wallet(keypair)

const binanceClient = new binanceusdm({
    apiKey: process.env.binanceApiKey,
    secret: process.env.binanceSecret
})


const main = async () => {
    let baseAsset = 'LUNA'
    let amount = 1
    let limit = 5
    let count = 0
    
    const arbClient = await new ArbClient().from(
        wallet,
        binanceClient,
        baseAsset,
        amount,
        limit,
        count
    )

    arbClient.loop()
}


main()
