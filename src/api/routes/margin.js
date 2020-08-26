const Koa = require('koa')
const route = require('koa-route')
const { constants, utils, db } = require('@goatfishes/utils')

module.exports = async () => {
    const app = new Koa()

    /**
     * Retrive The margin from all the different bots and commit the results to kafka
     * 
     * @param {string} botId Unique name to identifyt the bot
     * 
     * @returns
     */
    app.use(route.get('/', async (ctx) => {
        try {
            let keys
            let margin
            let exchangeModule
            const topic = "margin"
            const botId = await ctx.request.query.botId

            utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            ctx.checkPayload(ctx, 'empty')

            utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving access keys`)
            if (botId === undefined){
                keys = await db.selectAllKeys()
            } else {
                keys = await db.selectKeysByBotId([botId])
            }

            for (let i = 0; i < keys.length; i += 1) {
                utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading the ${keys[i].exchange} module`)
                exchangeModule = require(`../exchanges/${keys[i].exchange}/${keys[i].exchange}`)

                utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Getting margin from ${keys[i].exchange} api`)
                const params = {
                    "keys": keys[i].bot_key
                }
                margin = await exchangeModule.getMargin(params)

                utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Push information to kafka`)
                const marginObject = {
                    botId: keys[i].bot_id,
                    exchange: keys[i].exchange,
                    data: margin
                }
                utils.kafkaProduce(topic, marginObject)
            }
            ctx.status = 200
            ctx.body = {
                data: "OK"
            }
        } catch (e) { throw new utils.ExceptionHandler(constants.RESPONSE_CODES.APPLICATION_ERROR, `Margin retrieval failed with fatal error: ${e}`) }
    }))

    return app
}
