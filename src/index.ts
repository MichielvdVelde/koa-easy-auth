'use strict'

import { IncomingMessage } from 'http'
import { Middleware } from 'koa'

export interface Strategy<T> {
  (req: IncomingMessage): Promise<T>
}

export default class Authentication<T extends { [key: string]: any }> {
  public readonly realm: string

  protected strategies: Map<string, Strategy<T>> = new Map()

  public constructor (realm: string) {
    this.realm = realm
  }

  public use (type: string, strategy: Strategy<T>) {
    this.strategies.set(type.toLowerCase(), strategy)
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

    types = types.map(type => type.toLowerCase())

    return async (ctx, next) => {
      const authHeader = ctx.req.headers.authorization

      if (!authHeader || !authHeader.includes(' ')) {
        // Missing or invalid authorization header
        ctx.status = 401
        ctx.set('WWW-Authenticate', `realm="${this.realm}", charset="UTF-8"`)
        return
      }

      const authType = authHeader.split(' ')[0].toLowerCase()

      if (!types.includes(authType)) {
        // Unsupported authorization type
        ctx.status = 401
        ctx.set('WWW-Authenticate', `realm="${this.realm}", charset="UTF-8"`)
        return
      }

      const strategy = this.strategies.get(authType)

      let result: T

      try {
        result = await strategy(ctx.req)
      } catch (e) {
        ctx.status = e.status || 401

        if (ctx.status === 401) {
          ctx.set('WWW-Authenticate', `realm="${this.realm}", charset="UTF-8"`)
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
