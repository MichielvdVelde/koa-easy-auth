'use strict'

import { Middleware, ParameterizedContext, DefaultState } from 'koa'

import { paramsToString } from './util'

export interface Strategy<StateT = DefaultState> {
  (ctx: ParameterizedContext<StateT>): Promise<void>
}

export interface StrategyDescriptor<StateT = DefaultState> {
  strategy: Strategy<StateT>,
  params: { [key: string]: string | number }
}

export default class Authentication<StateT = DefaultState> {
  protected strategies: Map<string, StrategyDescriptor<StateT>> = new Map()

  public use (
    type: string,
    strategy: Strategy<StateT>,
    params: { [key: string]: string | number } = {}
  ) {
    this.strategies.set(type.toLowerCase(), { strategy, params })
  }

  public middleware (...types: string[]): Middleware<StateT> {
    if (types.length === 0) {
      throw new TypeError('middleware() expects at least one type')
    }

    types.forEach(type => {
      if (!this.strategies.has(type.toLowerCase())) {
        throw new Error(`Missing strategy for type '${type}'`)
      }
    })

    const typesLowerCase = types.map(type => type.toLowerCase())
    const authenticationHeaders = this.buildAuthenticateHeaders(types)

    return async (ctx, next) => {
      const authHeader = ctx.req.headers.authorization

      if (!authHeader || !authHeader.includes(' ')) {
        // Missing or invalid authorization header
        ctx.status = 401
        ctx.set('WWW-Authenticate', authenticationHeaders)
        return
      }

      const authType = authHeader.split(' ')[0].toLowerCase()

      if (!typesLowerCase.includes(authType)) {
        // Unsupported authorization type
        ctx.status = 401
        ctx.set('WWW-Authenticate', authenticationHeaders)
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
          ctx.set('WWW-Authenticate', authenticationHeaders)
        }

        return
      }

      (ctx.state as any).authenticated = true

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
