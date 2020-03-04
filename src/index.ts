'use strict'

import { Middleware, ParameterizedContext } from 'koa'

import { paramsToString } from './util'

export interface Strategy {
  (ctx: ParameterizedContext): Promise<void>
}

export interface StrategyDescriptor {
  strategy: Strategy,
  params: { [key: string]: string | number }
}

export default class Authentication {
  protected strategies: Map<string, StrategyDescriptor> = new Map()

  public use (
    type: string,
    strategy: Strategy,
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

    return async (ctx, next) => {
      const authHeader = ctx.req.headers.authorization

      if (!authHeader || !authHeader.includes(' ')) {
        // Missing or invalid authorization header
        ctx.status = 401
        ctx.set('WWW-Authenticate', this.buildAuthenticateHeaders(types))
        return
      }

      const authType = authHeader.split(' ')[0].toLowerCase()

      if (!typesLowerCase.includes(authType)) {
        // Unsupported authorization type
        ctx.status = 401
        ctx.set('WWW-Authenticate', this.buildAuthenticateHeaders(types))
        return
      }

      const { strategy } = this.strategies.get(authType)

      try {
        await strategy(ctx)
      } catch (e) {
        ctx.status = e.status || 401

        if (e.expose && e.message) {
          ctx.body = e.message
        }

        if (ctx.status === 401) {
          ctx.set('WWW-Authenticate', this.buildAuthenticateHeaders(types))
        }

        return
      }

      ctx.state.authenticated = true

      return next()
    }
  }

  protected buildAuthenticateHeaders (types: string[]) {
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
}
