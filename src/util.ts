'use strict'

export function paramsToString (params: { [key: string]: string | number } = {}) {
  return Object.keys(params).map(key => {
    // escape double quotes - https://gist.github.com/getify/3667624
    const escaped = `${params[key]}`.replace(/\\([\s\S])|(")/g,"\\$1$2")

    return `${key}="${escaped}"`
  }).join(', ')
}
