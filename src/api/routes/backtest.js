const Koa = require('koa')
const route = require('koa-route')
const uuid = require('uuid-random')
const { utils, constants, db } = require('@goatfishes/utils')

module.exports = async () => {
    const app = new Koa()

    /**
     * Query the historic price of a specific asset for a given time_frame
     * 
     * @param {string} binSize binSize of the candles: 1m, 15m, 1h, 1d 
     * @param {string} endTime The time you would like to stop retriving the price data  
     * @param {string} symbol The asset we want to retrive the historic data of
     * @param {string} botId The bot we will be using the historic data on
     * 
     * @returns 
     */
    app.use(route.post('/price', async (ctx) => {
        try {

            const uuidProcess = await uuid()
            let order
            let progress
            let endTime
            let startTime
            let progressObjectString
            const progressTopic = "requestState"

            utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'backtest')

            const keys = await db.selectKeysByBotId([payload.botId])
            const exchangeModule = require(`../exchanges/${keys[0].exchange}/${keys[0].exchange}`)

            // **************************** //
            //        Time structure        //
            //          ISO 8601            //
            // **************************** //

            const priceHistory = await db.selectLatestPriceHistory([payload.binSize, payload.symbol, keys[0].exchange])

            if (priceHistory.length) {
                startTime = (priceHistory[0]._timestamp).toISOString();
            } else {
                startTime = "2017-01-01T12:30:00.000Z"
            }

            if (payload.endTime != null) {
                endTime = payload.endTime
            } else {
                endTime = await new Date().toISOString()
            }

            // Set a refereence to the start date since this will change through out the lifecycle of the request
            const timeRef = startTime

            utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Process with UIID: ${uuidProcess} has started the backtesting task`)

            while (startTime < endTime) {

                const params = {
                    keys: keys[0].bot_key,
                    binSize: payload.binSize,
                    startTime,
                    endTime,
                    symbol: payload.symbol
                }

                order = await exchangeModule.getHistory(params)
                for (let i = 0; i < order.length; i += 1) {
                    await db.insertPriceHistory([params.symbol, payload.binSize, keys[0].exchange, order[i].timestamp, order[i].open, order[i].close, order[i].high, order[i].low, order[i].volume])
                }

                progress = ((startTime - timeRef) / (endTime - timeRef) * 100).toFixed(2)
                progressObjectString = { progress, uuid: uuidProcess }
                await utils.kafkaProduce(progressTopic, progressObjectString)
                startTime = order[order.length - 1].timestamp
            }

            progressObjectString = { progress: 100, uuid: uuidProcess }
            await utils.kafkaProduce(progressTopic, progressObjectString)
            utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Process with UIID: ${uuidProcess} has completed the backtesting task`)

            ctx.status = 202
            ctx.body = {
                data: {
                    uuid: uuidProcess,
                    message: "Processing the backtest"
                }
            }
        } catch (e) { throw new utils.ExceptionHandler(constants.RESPONSE_CODES.APPLICATION_ERROR, `backtest price points retrieval failed with fatal error: ${e}`) }
    }))

    return app
}
