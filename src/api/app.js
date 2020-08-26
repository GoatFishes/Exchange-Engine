const Koa = require('koa')
const cors = require('@koa/cors')
const mount = require('koa-mount')
const logger = require('koa-logger')
const keys = require('./routes/keys')
const orders = require('./routes/orders')
const margin = require('./routes/margin.js')
const bodyParser = require('koa-bodyparser')
const schema = require('./json_schema/schema')
const positions = require('./routes/positions')
const backtest = require('./routes/backtest.js')
const healthcheck = require('./routes/healthcheck.js')
const priceStreaming = require('./routes/priceStreaming.js')
const { constants, utils } = require('@goatfishes/utils')

const main = async () => {
    const app = new Koa()

    app.use(bodyParser())
    app.use(logger())

    app.use(cors({
        credentials: true
    }))

    app.use(async (ctx, next) => {
        try {
            utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `${ctx.request.href} ENDPOINT CALLED`)
            await next()
        } catch (err) {
            const errorResponse = utils.formatErrorResponse(err, ctx.request.href)
            ctx.status = errorResponse.status
            ctx.body = errorResponse.body

            ctx.app.emit('error', err, ctx)
        }
        finally {
            utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `${ctx.request.href} ENDPOINT CALL ENDED`)
        }
    })

    app.use(
        await schema({
            backtest: require('./json_schema/schemas/backtest.json'),
            keyBotUpload: require('./json_schema/schemas/keyBotUpload.json'),
            keyExchangeUpload: require('./json_schema/schemas/keyExchangeUpload.json'),
            setOrder: require('./json_schema/schemas/setOrder.json'),
            leverage: require('./json_schema/schemas/positionLeverage.json'),
            empty: require('./json_schema/schemas/empty.json'),
            priceStreaming: require('./json_schema/schemas/priceStreaming.json'),
            cancelOrder: require('./json_schema/schemas/cancelOrder.json')
        }))

    app.use(mount('/exchange_engine/key', await keys()))
    app.use(mount('/exchange_engine/orders', await orders()))
    app.use(mount('/exchange_engine/margin', await margin()))
    app.use(mount('/exchange_engine/positions', await positions()))
    app.use(mount('/exchange_engine/backtest', await backtest()))
    app.use(mount('/exchange_engine/healthcheck', await healthcheck()))
    app.use(mount('/exchange_engine/pricestream', await priceStreaming()))


    return app
}

if (require.main === module) {
    main()
        .then((app) => app.listen(process.env.EXCHANGESPORT), utils.logEvent(constants.LOG_LEVELS.info, constants.RESPONSE_CODES.LOG_MESSAGE_ONLY, `Listening On Port ${process.env.EXCHANGESPORT}`))
}

module.exports = { main }
