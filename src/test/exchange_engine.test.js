
const chai = require('chai')
const chaiHttp = require('chai-http')
const expect = chai.expect
chai.use(chaiHttp)
const { main } = require('./api/app')


let server
const keys = {
    "apiKeyID": process.env.API_KEY_ID,
    "apiKeySecret": process.env.API_KEY_SECRET
}

console.log(keys)

const { db, utils } = require('@goatfishes/utils')

sleep = m => new Promise(r => setTimeout(r, m))

let orderId

describe('Bitmex API', () => {
    before(async () => {
        const app = await main()
        server = app.listen(3001)
    })

    after(() => {
        server.close()
    })

    describe('Healthcheck File', () => {
        var res
        describe('/healthcheck enpdoint', () => {
            before(async () => {
                res = await chai
                    .request(server)
                    .get('/exchange_engine/healthcheck')
            })

            it('Should return 200 when calling /healthcheck for the container', async () => {
                expect(res).to.have.status(200)
            })

            it('Should return the correct message', () => {
                expect(res.text).to.eql('{"data":"OK"}');
            })
        })
    })

    describe('Price Stream File', () => {
        describe('/add enpdoint', () => {

            describe('should add a price stream', () => {
                before(async () => {
                    await db.insertExchangeKeys(["bitmex", keys])
                    res = await chai
                        .request(server)
                        .post('/exchange_engine/pricestream/add')
                        .set('content-type', 'application/json')
                        .send({ "exchange": "bitmex", "timeFrame": "5m", "asset": "XBTUSD" })
                })

                it('Should return a success message for the call', async () => {
                    expect(res).to.have.status(200)
                })

                it('Should returna success message for the call', async () => {
                    expect(res.text).to.eql('{"data":{"asset":"XBTUSD","timeFrame":"5m","exchange":"bitmex"}}');
                    expect(res.body).to.have.property('data');
                    expect(res.body.data).to.have.property('exchange');
                    expect(res.body.data).to.have.property('asset');
                    expect(res.body.data).to.have.property('timeFrame');
                })

                it('Should returna success message for the call', async () => {
                    expect(res.body).to.have.property('data');
                    expect(res.body.data).to.have.property('exchange');
                    expect(res.body.data).to.have.property('asset');
                    expect(res.body.data).to.have.property('timeFrame');
                })
            })

            describe('Should add a second price stream', async () => {
                before(async () => {
                    res = await chai
                        .request(server)
                        .post('/exchange_engine/pricestream/add')
                        .set('content-type', 'application/json')
                        .send({ "exchange": "bitmex", "timeFrame": "1m", "asset": "XBTUSD" })
                })

                it('Should return a success message for the call', async () => {
                    expect(res).to.have.status(200)
                })

                it('Should contain the correct status', async () => {
                    expect(res.text).to.eql('{"data":{"asset":"XBTUSD","timeFrame":"1m","exchange":"bitmex"}}');
                    expect(res.body).to.have.property('data');
                    expect(res.body.data).to.have.property('exchange');
                    expect(res.body.data).to.have.property('asset');
                    expect(res.body.data).to.have.property('timeFrame');
                })
            })

            describe('Should fail to add a repeated price stream', async () => {
                before(async () => {
                    res = await chai
                        .request(server)
                        .post('/exchange_engine/pricestream/add')
                        .set('content-type', 'application/json')
                        .send({ "exchange": "bitmex", "timeFrame": "1m", "asset": "XBTUSD" })
                })

                it('Should return a success message for the call', async () => {
                    expect(res).to.have.status(550)
                })
            })
        })

        after(async () => {
            await db.TruncateTables()
        })
    })

    describe('Backtest File', () => {
        describe('/price endpoint', async () => {
            before(async () => {
                await db.insertExchangeKeys(["bitmex", keys])
                await db.insertBotKeys(["defaultKeys", keys, "bitmex"])
                res = await chai
                    .request(server)
                    .post('/exchange_engine/backtest/price')
                    .set('content-type', 'application/json')
                    .send({ "binSize": "1m", "endTime": "2017-01-01T12:35:00.000Z", "symbol": "XBT", "botId": "defaultKeys" })
            })

            it('Should succesfully call the / endpoint', async () => {
                expect(res).to.have.status(202)
            })

            it('Should persist the information to the database', async () => {
                await sleep(500)
                let data = await db.selectAllPriceHistory(["1m", "XBT", "bitmex"])
                expect(data[0]).to.have.property('pair');
                expect(data[0]).to.have.property('time_frame');
                expect(data[0]).to.have.property('exchange');
                expect(data[0]).to.have.property('_timestamp');
                expect(data[0]).to.have.property('_open');
                expect(data[0]).to.have.property('_close');
                expect(data[0]).to.have.property('_high');
                expect(data[0]).to.have.property('_low');
                expect(data[0]).to.have.property('_volume');
            })

            it('Should contain the correct status', async () => {
                expect(res.body).to.have.property('data');
                expect(res.body.data).to.have.property('uuid');
                expect(res.body.data).to.have.property('message');
            })
        })

        describe('/price endpoint', async () => {
            before(async () => {
                await db.insertExchangeKeys(["bitmex", keys])
                await db.insertBotKeys(["defaultKeys", keys, "bitmex"])
                res = await chai
                    .request(server)
                    .post('/exchange_engine/backtest/price')
                    .set('content-type', 'application/json')
                    .send({ "binSize": "1m", "endTime": "2017-01-01T12:35:00.000Z", "symbol": "XBT", "botId": "defaultKeys" })
            })

            it('Should succesfully call the / endpoint', async () => {
                expect(res).to.have.status(202)
            })

            it('Should persist the information to the database', async () => {
                await sleep(500)
                let data = await db.selectAllPriceHistory(["1m", "XBT", "bitmex"])
                expect(data[0]).to.have.property('pair');
                expect(data[0]).to.have.property('time_frame');
                expect(data[0]).to.have.property('exchange');
                expect(data[0]).to.have.property('_timestamp');
                expect(data[0]).to.have.property('_open');
                expect(data[0]).to.have.property('_close');
                expect(data[0]).to.have.property('_high');
                expect(data[0]).to.have.property('_low');
                expect(data[0]).to.have.property('_volume');
            })

            it('Should contain the correct status', async () => {
                expect(res.body).to.have.property('data');
                expect(res.body.data).to.have.property('uuid');
                expect(res.body.data).to.have.property('message');
            })
        })

        after(async () => {
            await db.TruncateTables()
        })
    })

    describe('Keys File', () => {
        describe('/upload/bots endpoint', () => {
            before(async () => {
                res = await chai
                    .request(server)
                    .post('/exchange_engine/key/upload/bots')
                    .set('content-type', 'application/json')
                    .send({ "botId": "defaultKeys", "apiKeyId": keys.apiKeyID, "apiKeySecret": keys.apiKeySecret, "exchange": "bitmex" })
            })

            it('Should succesfully call the / endpoint', async () => {
                expect(res).to.have.status(200)
            })

            it('Should persist the new key to the database', async () => {
                let botInfo = await db.selectAllKeys()
                expect("defaultKeys").to.eql(botInfo[0].bot_id);
                //await botInfo[0].key.socket.instance._events.close("1000")
            })

            it('Should return the correct message', () => {
                expect(res.text).to.eql('{"data":"OK"}');
            })
        })

        describe('/upload/exchange endpoint', () => {
            before(async () => {
                res = await chai
                    .request(server)
                    .post('/exchange_engine/key/upload/exchange')
                    .set('content-type', 'application/json')
                    .send({ "apiKeyId": keys.apiKeyID, "apiKeySecret": keys.apiKeySecret, "exchange": "bitmex" })
            })

            it('Should succesfully call the / endpoint', async () => {
                expect(res).to.have.status(200)
            })

            it('Should persist the new key to the database', async () => {
                let botInfo = await db.selectKeysByExchange(["bitmex"])
                expect("bitmex").to.eql(botInfo[0].exchange);
            })

            it('Should return the correct message', () => {
                expect(res.text).to.eql('{"data":"OK"}');
            })
        })

        after(async () => {
            await db.TruncateTables()
        })
    })

    describe('Margin File', () => {
        describe('/ endpoint', () => {
            before(async () => {
                await db.insertBotKeys(["defaultKeys", keys, "bitmex"])
                res = await chai
                    .request(server)
                    .get('/exchange_engine/margin?bot_id=null')
            })

            it('Should succesfully call the / endpoint', async () => {
                expect(res).to.have.status(200)
            })

            it('Should push the correct data to Kafka', async () => {
                let msg = await utils.consumer("margin")
                let parsedMsg = JSON.parse(msg[0].value)

                expect(parsedMsg).to.have.property("botId")
                expect(parsedMsg).to.have.property("exchange")
                expect(parsedMsg.data).to.have.property("account")
                expect(parsedMsg.data).to.have.property("currency")
                expect(parsedMsg.data).to.have.property("prevTimestamp")
            })

            it('Should return the correct message', () => {
                expect(res.text).to.eql('{"data":"OK"}');
            })
        })

        after(async () => {
            await db.TruncateTables()
        })
    })

    describe('Orders File', () => {
        describe('/ endpoint', () => {
            before(async () => {
                await db.insertBotKeys(["defaultKeys", keys, "bitmex"])

                res = await chai
                    .request(server)
                    .get('/exchange_engine/orders?bot_id=defaultKeys&type=filled')
            })

            it('Should succesfully call the / endpoint', async () => {
                expect(res).to.have.status(200)
            })

            it('Should push the correct data to Kafka', async () => {
                let msg = await utils.consumer("orders")
                let parsedMsg = JSON.parse(msg[0].value)

                expect(parsedMsg).to.have.property('botId');
                expect(parsedMsg).to.have.property('exchange');
                expect(parsedMsg).to.have.property('data');
            }).timeout(6000)

            it('Should return the correct message', () => {
                expect(res.text).to.eql('{"data":"OK"}');
            })
        })

        describe('/set endpoint', () => {
            before(async () => {
                await db.insertBotKeys(["defaultKeys", keys, "bitmex"])

                res = await chai
                    .request(server)
                    .post('/exchange_engine/orders/set')
                    .set('content-type', 'application/json')
                    .send({ "botId": "defaultKeys", "symbol": "XBTUSD", "orderType": "Limit", "timeInForce": "GoodTillCancel", "price": 8000, "orderQty": 10, "side": "Buy" })
            })

            it('Should succesfully call the / endpoint', async () => {
                expect(res).to.have.status(200)
            })

            it('Should push the correct order to the exchange', async () => {
                orderId = res.body.data.orderId
                expect(res.body.data).to.have.property('exchange');
                expect(res.body.data).to.have.property('orderId');
                expect(res.body.data).to.have.property('timeStamp');
                expect(res.body.data).to.have.property('orderStatus');
                expect(res.body.data).to.have.property('side');
                expect(res.body.data).to.have.property('orderQuantity');
                expect(res.body.data).to.have.property('price');
            })
        })

        describe('/cancel endpoint', () => {
            before(async () => {
                await db.insertBotKeys(["defaultKeys", keys, "bitmex"])
                await db.insertOrder(["defaultKeys", "bitmex", orderId, null, "2019-08-08T01:04:28.939Z", "Open", "Buy", 1000, 8000, 4000, 10, "Limit", "10"])

                res = await chai
                    .request(server)
                    .post('/exchange_engine/orders/cancel')
                    .set('content-type', 'application/json')
                    .send({ "botId": "defaultKeys", "orderId": orderId })
            })

            it('Should succesfully call the / endpoint', async () => {
                expect(res).to.have.status(200)
            })

            it('Should push the correct order to the exchange', async () => {
                expect(res.body.data).to.have.property('exchange');
                expect(res.body.data).to.have.property('orderId');
                expect(res.body.data).to.have.property('timeStamp');
                expect(res.body.data).to.have.property('orderStatus');
                expect(res.body.data).to.have.property('side');
                expect(res.body.data).to.have.property('orderQuantity');
                expect(res.body.data).to.have.property('price');
                expect(res.body.data.orderStatus).to.eql('Canceled');
            })

            it('Should update the state of the order', async () => {
                let orderInfo = await db.selectOrdersByStatus(['Canceled'])
                expect(orderInfo[0].order_id).to.eql(orderId)
            })
        })

        after(async () => {
            await db.TruncateTables()
        })
    })

    describe('Position File', () => {
        describe('/ endpoint', () => {
            before(async () => {
                await db.insertBotKeys(["defaultKeys", keys, "bitmex"])
                res = await chai
                    .request(server)
                    .get('/exchange_engine/positions?bot_id=defaultKeys&symbol=XBTUSD')
            })

            it('Should succesfully call the / endpoint', async () => {
                expect(res).to.have.status(200)
            })

            it('Should push the correct data to Kafka', async () => {
                let msg = await utils.consumer("positions")
                let parsedMsg = JSON.parse(msg[0].value)

                expect(parsedMsg).to.have.property("botId")
                expect(parsedMsg).to.have.property("data")
                expect(parsedMsg.data).to.have.property("account")
                expect(parsedMsg.data).to.have.property("marginCallPrice")
                expect(parsedMsg.data).to.have.property("symbol")
            })

            it('Should return the correct message', () => {
                expect(res.text).to.eql('{"data":"OK"}');
            })
        })

        describe('/leverage endpoint', () => {
            before(async () => {
                await db.insertBotKeys(["defaultKeys", keys, "bitmex"])
                res = await chai
                    .request(server)
                    .post('/exchange_engine/positions/leverage')
                    .set('content-type', 'application/json')
                    .send({ "botId": "defaultKeys", "symbol": "XBTUSD", "leverage": 10 })
            })

            it('Should succesfully call the / endpoint', async () => {
                expect(res).to.have.status(200)
            })

            it('Should push the correct data to Kafka', async () => {
                expect(res.body.data.leverage).to.have.eql(10)
            })
        })

        describe('/leverage with a wrong payload', () => {
            before(async () => {
                await db.insertBotKeys(["defaultKeys", keys, "bitmex"])
                res = await chai
                    .request(server)
                    .post('/exchange_engine/positions/leverage')
                    .set('content-type', 'application/json')
                    .send({})
            })

            it('Should succesfully call the / endpoint', async () => {
                expect(res).to.have.status(550)
            })
        })
    })
})