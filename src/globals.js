import { BEthSafePriceValidator } from './BEthSafePriceValidator'

export const globals = {
  env: 'development',
  sentryProjectId: '',
  sentryKey: '',
  ethRpcs: [],
  deviationBlockOffsets: [],
  bEthSafePriceValidator: new BEthSafePriceValidator(),
  requestTimeout: 30000,
}

export function setGlobals({
  env,
  sentryProjectId,
  sentryKey,
  ethRpcs,
  deviationBlockOffsets,
  bEthRateLimits,
  bEthPriceLimits,
  stEthRateLimits,
  ethPriceLimits,
  requestTimeout,
}) {
  globals.env = env || globals.env
  globals.sentryProjectId = sentryProjectId || globals.sentryProjectId
  globals.sentryKey = sentryKey || globals.sentryKey
  globals.ethRpcs = ethRpcs || globals.ethRpcs
  globals.deviationBlockOffsets =
    deviationBlockOffsets || globals.deviationBlockOffsets
  globals.bEthSafePriceValidator = new BEthSafePriceValidator({
    deviationBlockOffsets,
    bEthRate: bEthRateLimits,
    bEthPrice: bEthPriceLimits,
    stEthRate: stEthRateLimits,
    ethPrice: ethPriceLimits,
  })
  globals.requestTimeout = requestTimeout || globals.requestTimeout
}
