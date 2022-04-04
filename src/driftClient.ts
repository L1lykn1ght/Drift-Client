import { Connection, Keypair } from "@solana/web3.js"
import {
    BN,
    Wallet,
    ClearingHouse,
    ClearingHouseUser,
    Markets,
    convertToNumber,
    calculateMarkPrice,
    PositionDirection
} from "@drift-labs/sdk"
import { sleep, wrapInTx, clearingHouseProgramId, QUOTE_PRECISION, updateNumber } from "./util"
import { ftx, binanceusdm } from "ccxt"


export class ArbClient {
    connection = new Connection(process.env.RPCendpoint)
    keypair: Keypair

    clearingHouse: ClearingHouse
    clearingHouseUser: ClearingHouseUser
    cexClient: ftx | binanceusdm
    
    amount: number
    limit: number
    count: number

    baseAsset: string
    symbol: string
    updateNum: number
    marketIndex: BN

    driftPrice: number
    cexPriceBuy: number
    cexPriceSell: number
    tmpCexPriceBuy: number
    tmpCexPriceSell: number

    diffBuy = 0.3
    diffSell = 0.3

    flag = {
        cexBuy: true,
        cexSell: true,
        driftBuy: false,
        driftSell: false
    }

    orderIDBuy: string
	orderIDSell: string
    statusBuy: string
    statusSell: string
    remainingBuy: number
    remainingSell: number


    async from(wallet: Wallet, cexClient: ftx | binanceusdm, baseAsset: string, amount: number, limit: number, count = 0) {
        this.clearingHouse = ClearingHouse.from(
            this.connection,
            wallet,
            clearingHouseProgramId
        )
        await this.clearingHouse.subscribe()

        this.clearingHouseUser = ClearingHouseUser.from(
            this.clearingHouse,
            wallet.publicKey
        )
        await this.clearingHouseUser.subscribe()

        this.keypair = wallet.payer

        this.cexClient = cexClient

        this.amount = amount
        this.remainingBuy = amount
        this.remainingSell = amount
        this.limit = limit
        this.count = count

        this.baseAsset = baseAsset

        switch (cexClient.name) {
            case 'FTX':
                this.symbol = baseAsset + '-PERP'
                this.updateNum = updateNumber.ftx[baseAsset]
                break
            case 'Binance USDⓈ-M':
                this.symbol = baseAsset + 'USDT'
                this.updateNum = updateNumber.binance[baseAsset]
                break
        }

        let marketInfo = Markets.find((market) => market.baseAssetSymbol === baseAsset)
        this.marketIndex = marketInfo.marketIndex

        this.clearingHouse.eventEmitter.addListener(
            'marketsAccountUpdate',
            async (d) => {
                this.driftPrice = convertToNumber(
                    calculateMarkPrice(d.markets[this.marketIndex.toNumber()])
                )
                this.tmpCexPriceBuy = this.driftPrice * (1 - this.diffBuy / 100)
                this.tmpCexPriceSell = this.driftPrice * (1 + this.diffSell / 100)
            }
        )

        while (!this.driftPrice) {
            await sleep(100)
        }

        return this
    }


    async createCexLimitBuyOrder() {
        this.flag.cexBuy = false
        this.cexPriceBuy = this.tmpCexPriceBuy

        while (true) {
            try {
                let info = await this.cexClient.createLimitBuyOrder(
                    this.symbol,
                    this.remainingBuy,
                    this.cexPriceBuy
                )
                this.orderIDBuy = info.id
                this.statusBuy = info.status
                break
            } catch (e) { console.log(e.message) }
        }
    }


    async createCexLimitSellOrder() {
        this.flag.cexSell = false
        this.cexPriceSell = this.tmpCexPriceSell

        while (true) {
            try {
                let info = await this.cexClient.createLimitSellOrder(
                    this.symbol,
                    this.remainingSell,
                    this.cexPriceSell
                )
                this.orderIDSell = info.id
                this.statusSell = info.status
                break
            } catch (e) { console.log(e.message) }
        }
    }


    async fetchCexLimitBuyOrder() {
        while (true) {
            try {
                let info = await this.cexClient.fetchOrder(
                    this.orderIDBuy,
                    this.symbol
                )
                this.statusBuy = info.status
                this.remainingBuy = info.remaining
                break
            } catch (e) { console.log(e.message) }
        }
    }


    async fetchCexLimitSellOrder() {
        while (true) {
            try {
                let info = await this.cexClient.fetchOrder(
                    this.orderIDSell,
                    this.symbol
                )
                this.statusSell = info.status
                this.remainingSell = info.remaining
                break
            } catch (e) { console.log(e.message) }
        }
    }


    async editCexLimitBuyOrder() {
        try {
            this.cexPriceBuy = this.tmpCexPriceBuy
            let info = await this.cexClient.editOrder(
                this.orderIDBuy,
                this.symbol,
                'limit',
                'buy',
                this.remainingBuy,
                this.cexPriceBuy
            )
            this.orderIDBuy = info.id
        } catch (e) { console.log(e.message) }
    }


    async editCexLimitSellOrder() {
        try {
            this.cexPriceSell = this.tmpCexPriceSell
            let info = await this.cexClient.editOrder(
                this.orderIDSell,
                this.symbol,
                'limit',
                'sell',
                this.remainingSell,
                this.cexPriceSell
            )
            this.orderIDSell = info.id
        } catch (e) { console.log(e.message) }
    }


    async createDriftBuyOrder() {
        this.flag.driftBuy = false
        this.flag.cexSell = true
        this.count -= 1

        while (true) {
            try {
                let signature = await this.connection.sendTransaction(
                    wrapInTx(
                        await this.clearingHouse.getOpenPositionIx(
                            PositionDirection.LONG,
                            new BN(this.driftPrice * this.amount * QUOTE_PRECISION),
                            this.marketIndex
                        )
                    ),
                    [this.keypair],
                    {skipPreflight: true}
                )
                console.log(signature)
                break
            } catch (e) { console.log(e.message) }
        }
    }


    async createDriftSellOrder() {
        this.flag.driftSell = false
        this.flag.cexBuy = true
        this.count += 1

        while (true) {
            try {
                let signature = await this.connection.sendTransaction(
                    wrapInTx(
                        await this.clearingHouse.getOpenPositionIx(
                            PositionDirection.SHORT,
                            new BN(this.driftPrice * this.amount * QUOTE_PRECISION),
                            this.marketIndex
                        )
                    ),
                    [this.keypair],
                    {skipPreflight: true}
                )
                console.log(signature)
                break
            } catch (e) { console.log(e.message) }
        }
    }


    async loop() {
        while (true) {
            
            if (this.count < this.limit) {
                if (this.flag.cexBuy) {
                    await this.createCexLimitBuyOrder()
                }

                await this.fetchCexLimitBuyOrder()

                switch (this.statusBuy) {
                    case 'closed':
                        console.log('Cex Buy Order Executed')
                        this.flag.driftSell = true
                        this.remainingBuy = this.amount
                        break
                    
                    case 'canceled':
                        this.flag.cexBuy = true
                        break
                    
                    default:
                        if (Math.abs(this.tmpCexPriceBuy - this.cexPriceBuy) >= this.updateNum) {
                            await this.editCexLimitBuyOrder()
                        }
                }

                if (this.flag.driftSell) {
                    await this.createDriftSellOrder()

                    console.log('Drift Sell Order Executed')
                    console.log(`Count: ${this.count}, Position Amount: ${Math.abs(this.amount * this.count)} ${this.baseAsset}`)
                }
            }

            if (-this.limit < this.count) {
                if (this.flag.cexSell) {
                    await this.createCexLimitSellOrder()
                }

                await this.fetchCexLimitSellOrder()

                switch (this.statusSell) {
                    case 'closed':
                        console.log('Cex Sell Order Executed')
                        this.flag.driftBuy = true
                        this.remainingSell = this.amount
                        break
                    
                    case 'canceled':
                        this.flag.cexSell = true
                        break
                    
                    default:
                        if (Math.abs(this.tmpCexPriceSell - this.cexPriceSell) >= this.updateNum) {
                            await this.editCexLimitSellOrder()
                        }
                }

                if (this.flag.driftBuy) {
                    await this.createDriftBuyOrder()

                    console.log('Drift Buy Order Executed')
                    console.log(`Count: ${this.count}, Position Amount: ${Math.abs(this.amount * this.count)} ${this.baseAsset}`)
                }
            }

            await sleep(100)
        }
    }
}
