'use strict'

export function paramsToString (params: { [key: string]: string | number } = {}) {
  // TODO: escape params[key]
  return Object.keys(params).map(key => `${key}="${params[key]}"`).join(', ')
}
