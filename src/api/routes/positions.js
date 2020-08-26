const Koa = require('koa')
const route = require('koa-route')
const { constants, utils, db } = require('@goatfishes/utils')

module.exports = async () => {
    const app = new Koa()

    /**
     * Retrive all the positions from Bitmex and and commit the results to kafka
     * 
     * @param {string} botId Unique name to identify the bot
     * @param {string} symbol Identify the position we want to open a ws for
     * 
     * @returns A success message for the retrieval and pushing of the open position into kafka
     */
    app.use(route.get('/', async (ctx) => {
        try {
            let keys
            const botId = await ctx.request.query.botId
            const symbol = await ctx.request.query.symbol

            utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            ctx.checkPayload(ctx, 'empty')

            utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving bot keys`)
            if (botId === undefined) {
                keys = await db.selectAllKeys()
            } else {
                keys = await db.selectKeysByBotId([botId])
            }

            for (let i = 0; i < keys.length; i += 1) {
                utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading the ${keys[i].exchange} module`)
                const exchangeModule = require(`../exchanges/${keys[i].exchange}/${keys[i].exchange}`)

                const key = keys[i].bot_key
                utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Getting the open positions for ${keys[i].exchange}`)
                await exchangeModule.getPositions({ keys: key, botId:keys[i].bot_id, symbol })
            }
            ctx.status = 200
            ctx.body = {
                data: "OK"
            }
        } catch (e) { throw new utils.ExceptionHandler(constants.RESPONSE_CODES.APPLICATION_ERROR, `Position retrieval failed with fatal error: ${e}`) }
    }))

    /**
     * Set the leverage for the positions
     * 
     * @param {string}  botId Unique name to identify the bot
     * @param {string}  symbol Identify the position we want to open a modify the leverage on
     * @param {integer} leverage Leverage change 
     * 
     * @returns A success message for the retrieval and pushing of the orders into kafka
     */
    app.use(route.post('/leverage', async (ctx) => {
        try {

            const payload = ctx.checkPayload(ctx, 'leverage')

            let keys
            let leverage

            if(payload.botId === "null"){ 
                keys = await db.selectAllKeys()
            }else{
                keys = await db.selectKeysByBotId([payload.botId])
            }

            for (let i = 0; i < keys.length; i+=1) {
                utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading the ${keys[i].exchange} module`)

                const exchangeModule = require(`../exchanges/${keys[i].exchange}/${keys[i].exchange}`)

                const key = keys[i].bot_key

                utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Setting the desired leverage for ${payload.botId}, on the ${payload.symbol} pair`)

                const params = {
                    keys: key,
                    symbol: payload.symbol,
                    leverage: payload.leverage
                }

                leverage = await exchangeModule.setLeverage(params)
            }

            ctx.status = 200
            ctx.body = {
                data: {
                    leverage: leverage.leverage
                }
            }
        } catch (e) { throw new utils.ExceptionHandler(constants.RESPONSE_CODES.APPLICATION_ERROR, `Leverage setting failed with fatal error: ${e}`) }
    }))

    return app
}
