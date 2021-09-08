import jsonrpc from 'jsonrpc-lite'
import { log } from './sentry'
import { globals } from './globals'

import axios from 'axios'

/**
  Makes eth_call JSON RPC request to ethereum etnode.
  To make method more robust can use multiple JSON RPC nodes.
  Nodes list has to be set via ETH_NODES environment variable.
  If request to one of nodes failed will try to use next node in the list.
  If all requests to nodes failed, will throwAllApiEndpointsFailedError
  @returns result of eth call.
 */
export async function ethCall(params) {
  return apiEndpoints
    .makeRequest(jsonrpc.request(1, 'eth_call', params))
    .catch(error => {
      throw new EthCallError(params, error)
    })
}

export async function ethBlockNumber() {
  return apiEndpoints
    .makeRequest(jsonrpc.request(1, 'eth_blockNumber'))
    .catch(error => {
      throw new EthCallError([], error)
    })
}

/**
 * Provides convenient interface to make request to list of nodes.
 * Takes API urls one by one and returns first successfull response.
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

    /**
     * create a thread of promises that executes the next promise only when one fails.
     * if everything failes, response promise would remain rejected
     *  */
    return (
      endpoints
        .reduce(
          (thread, endpoint) =>
            thread.catch(async () => {
              return axios
                .post(endpoint, JSON.stringify(payload), {
                  timeout: globals.requestTimeout,
                  headers: {
                    'Content-Type': 'application/json',
                  },
                })
                .then(res => {
                  const { result } = res.data
                  if (result) {
                    return result
                  } else {
                    throw new Error('no result')
                  }
                })
                .catch(async error => {
                  await log(new ApiRequestError(endpoints, error.status, error))
                  return Promise.reject()
                })
            }),
          Promise.reject(),
        )

        /* throw if still rejected */
        .catch(() => {
          throw new AllApiEndpointsFailedError()
        })
    )
  },
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
