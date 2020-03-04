'use strict'

import { IncomingMessage } from 'http'
import { Middleware } from 'koa'

import { paramsToString } from './util'

export interface Strategy<T> {
  (req: IncomingMessage): Promise<T>
}

export interface StrategyDescriptor<T> {
  strategy: Strategy<T>,
  params: { [key: string]: string | number }
}

export default class Authentication<T extends { [key: string]: any }> {
  public readonly realm: string

  protected strategies: Map<string, StrategyDescriptor<T>> = new Map()

  public constructor (realm: string) {
    this.realm = realm
  }

  public use (
    type: string,
    strategy: Strategy<T>,
    params: { [key: string]: string | number } = {}
  ) {
    this.strategies.set(type.toLowerCase(), { strategy, params })
  }

  public middleware (...types: string[]): Middleware {
    if (types.length === 0) {
      throw new TypeError('middleware() expects at least one type')
    }

    types.forEach(type => {
      if (!this.strategies.has(type.toLowerCase())) {
        throw new Error(`Missing strategy for type '${type}'`)
      }
    })

    const typesLowerCase = types.map(type => type.toLowerCase())

    // builds a WWW-Authenticate entry for each
    // supported authorization type
    const buildAuthenticate = () => {
      const headers: string[] = []

      for (const type of types) {
        const { params } = this.strategies.get(type.toLowerCase())

        if (Object.keys(params).length) {
          headers.push(`${type} ${paramsToString(params)}`)
        } else {
          headers.push(type)
        }
      }

      return headers
    }

    return async (ctx, next) => {
      const authHeader = ctx.req.headers.authorization

      if (!authHeader || !authHeader.includes(' ')) {
        // Missing or invalid authorization header
        ctx.status = 401
        ctx.set('WWW-Authenticate', buildAuthenticate())
        return
      }

      const authType = authHeader.split(' ')[0].toLowerCase()

      if (!typesLowerCase.includes(authType)) {
        // Unsupported authorization type
        ctx.status = 401
        ctx.set('WWW-Authenticate', buildAuthenticate())
        return
      }

      const { strategy } = this.strategies.get(authType)

      let result: T

      try {
        result = await strategy(ctx.req)
      } catch (e) {
        ctx.status = e.status || 401

        if (ctx.status === 401) {
          ctx.set('WWW-Authenticate', buildAuthenticate())
        }

        return
      }

      ctx.state = {
        ...ctx.state,
        ...result,
        authenticated: true
      }

      return next()
    }
  }
}
