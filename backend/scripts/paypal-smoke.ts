import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { createInterface } from 'node:readline/promises'
import { loadConfig } from '../src/config.js'
import { createPayPalClient, PayPalError } from '../src/paypal/client.js'
import { createOrderPayments } from '../src/paypal/orders.js'
import { createRefundPayments } from '../src/paypal/refunds.js'

async function main() {
  const config = loadConfig()
  const client = createPayPalClient(config)
  const callback = createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Return to the RecallRelay smoke test terminal after buyer approval.')
  })
  await new Promise<void>((resolve, reject) => {
    callback.once('error', reject)
    callback.listen(0, '127.0.0.1', resolve)
  })
  const terminal = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const address = callback.address()
    if (!address || typeof address === 'string') throw new Error('Local callback unavailable.')
    const orders = createOrderPayments(client, `http://localhost:${address.port}`)
    const order = await orders.create(100, randomUUID())
    console.log(order.approvalUrl)
    await terminal.question('Approve this order with the sandbox buyer, then press Enter to capture and refund $0.01. ')
    const captureId = await orders.capture(order.id, 100)
    const refund = await createRefundPayments(client).create(captureId, 1, randomUUID())
    console.log(`Sandbox refund ${refund.id} · ${refund.status}`)
    if (refund.status === 'FAILED' || refund.status === 'CANCELLED') process.exitCode = 1
  } finally {
    terminal.close()
    callback.close()
  }
}

main().catch((error: unknown) => {
  const debug = error instanceof PayPalError && error.debug_id ? ` Debug ID ${error.debug_id}.` : ''
  console.error(`The sandbox smoke test could not complete.${debug}`)
  process.exitCode = 1
})
