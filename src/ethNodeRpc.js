import jsonrpc from 'jsonrpc-lite'
import { log } from './sentry'
import { globals } from './globals'

/**
  Makes eth_call JSON RPC request to ethereum etnode.
  To make method more robust can use multiple JSON RPC nodes.
  Nodes list has to be set via ETH_NODES environment variable.
  If request to one of nodes failed will try to use next node in the list.
  If all requests to nodes failed, will throwAllApiEndpointsFailedError
  @returns result of eth call.
 */
export async function ethCall(params) {
  const response = await apiEndpoints.makeRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jsonrpc.request(1, 'eth_call', params)),
  })
  const { result, error } = await response.json()
  if (error) {
    throw new EthCallError(params, error)
  }
  return result
}

export async function ethBlockNumber() {
  const response = await apiEndpoints.makeRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jsonrpc.request(1, 'eth_blockNumber')),
  })
  const { result, error } = await response.json()
  if (error) {
    throw new EthCallError([], error)
  }
  return result
}

/**
 * Provides convenient interface to make request to list of nodes.
 * Takes API urls one by one and returns first successful response.
 * If some of requests fails will report error with information about fail to the Sentry.
 * If all requests fail throws AllApiEndpointsFailedError
 */
const apiEndpoints = {
  getEndpoints() {
    if (globals.ethRpcs.length === 0) {
      throw new Error('API endpoints not provided!')
    }
    return globals.ethRpcs
  },

  async makeRequest(payload) {
    const endpoints = this.getEndpoints()
    for (let i = 0; i < endpoints.length; ++i) {
      const [response, error] = await runWithTimeout(
        globals.requestTimeout,
        fetch(endpoints[i], payload),
      )
      if (response && response.status === 200) {
        return response
      }
      const status = response && response.status
      const text = response ? await response.text() : error.message
      await log(new ApiRequestError(endpoints[i], status, text))
    }
    throw new AllApiEndpointsFailedError()
  },
}

function runWithTimeout(timeout, callback) {
  return Promise.race([
    callback,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout Exceeded')), timeout),
    ),
  ])
    .then(response => [response, null])
    .catch(error => [null, error])
}

class ApiRequestError extends Error {
  constructor(url, status, text) {
    super('API request error')
    this.name = 'ApiRequestError'
    this.url = url
    this.status = status
    this.text = text
  }
}

class AllApiEndpointsFailedError extends Error {
  constructor() {
    super('All API endpoint requests failed')
  }
}

class EthCallError extends Error {
  constructor(params, error) {
    super('eth_call finished with error')
    this.params = params
    this.error = error
  }
}
