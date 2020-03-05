# koa-easy-auth

Easy and simple authentication for [Koa](https://github.com/koajs/koa).

* Uses the `Authorization` header
* Supports multiple authorization type strategies

Extracted from a personal project in which I required simple, no-nonsense
authentication with support for multiple authorization types.

Koa is marked as a peer dependency; you'll need to install Koa yourself.

## Install

```
npm i koa-easy-auth
```

## Example

See the source code for more specifics.

```ts
import Koa from 'koa'
import Authentication from 'koa-simple-auth'
import createError from 'http-errors'

import basicAuth from 'basic-auth'

const app = new Koa()
const auth = new Authentication()

// Add a strategy for the `Basic` authorization type
// NOTE: strategies are NOT middleware, a new strategy for the same type
// will REPLACE the old strategy!
auth.use('Basic', async ctx => {
  const credentials = basicAuth(ctx.req)
  
  // usually we'd do some checking here to see
  // if the supplied user name and password are correct
  if (credentials.pass !== 'secret') {
    throw createError(401, 'Invalid password')
  }
  
  // now we can update the state
  ctx.state.user = credentials.user
  
  // optional strategy parameters, are exposed in the WWW-Authenticate header
}, { realm: 'my-realm', charset: 'UTF-8' })

// Add a second strategy
auth.use('Token', async ctx => {
  const token = ctx.req.headers.authorization.split(' ')[1]
  
  if (token !== 'token') {
    throw createError(401, 'Invalid token')
  }
  
  // get user name somehow
  ctx.state.user = 'me'
})

// add the middleware for the `Basic` strategy only
app.use(auth.middleware('Basic'))

app.use(async ctx => {
  const { state } = ctx
  const { user } = state
  
  ctx.body = `Hello, you are ${user}!`
})

app.listen(3000)
```

## License

Copyright 2020 Michiel van der Velde.

This software is licensed under [the MIT License](LICENSE).
