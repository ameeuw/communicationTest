let { Client, utilities } = require('client');
let { ITransactionPayload, OrderTransactionPayload } = require("transactions");
let { to } = require('await-to-js');
let vstruct = require('varstruct')
let { stringify } = require('deterministic-json')

let TxStruct = vstruct([
  { name: 'data', type: vstruct.VarString(vstruct.UInt32BE) },
  { name: 'nonce', type: vstruct.UInt32BE }
])

function encode(txData, nonce) {
  let data = stringify(txData)
  let bytes = TxStruct.encode({ nonce, data })
  return bytes
}

let client = new Client('localhost', false, undefined, undefined)
let keystore = client.generateKeystore(client.generatePrivateKey())
let nonce = 0

function generateOrderTx() {
  let buyPrice = Math.round(Math.random()*2000)
  let sellPrice = Math.round(Math.random()*2000)
  let demand = Math.round(Math.random()*1000)
  let gridDemand = 0
  let payload = new OrderTransactionPayload(buyPrice, sellPrice, demand, gridDemand)
  let privKey = Buffer.from(keystore.priv_key.data, 'hex')
  let senderPubKey = client.generatePublicKey(privKey)
  let senderAddress = client.generateAddress(senderPubKey)
  let transaction = client.generateTransaction(senderPubKey, payload.type, nonce, '', 0, payload)
  let signedTransaction = utilities.sign(privKey, transaction)
  let serializedTransaction = utilities.serializeTx(signedTransaction)
  let tmNonce = Math.floor(Math.random() * (2 << 12))
  let txBytes = '0x' + encode(serializedTransaction, tmNonce).toString('hex')
  nonce++
  return txBytes
}

module.exports = generateOrderTx

if (!module.parent) {
  console.log(generateOrderTx())
}
