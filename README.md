# koa-easy-auth

Easy and simple authentication for [Koa](https://github.com/koajs/koa).

* Uses the `Authorization` header
* Supports multiple authorization type strategies
* Automatically merges authentication info into context state

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

import basicAuth, { BasicAuthResult } from 'basic-auth'

const app = new Koa()
const auth = new Authentication<{ credentials: BasicAuthResult }>

// Add a strategy for the `Basic` authorization type
// NOTE: strategies are NOT middleware, a new strategy for the same type
// will REPLACE the old strategy!
auth.use('Basic', async req => {
  const credentials = basicAuth(req)
  
  // usually we'd do some checking here to see
  // if the supplied user name and password are correct
  
  // the returned object is merged into ctx.state
  // NOTE: in actual code you may not want to expose the password!
  return {
    credentials
  }
  // optional strategy parameters, are exposed in the WWW-Authenticate header
}, { realm: 'my-realm', charset: 'UTF-8' })

// add the middleware for the `Basic` strategy only
app.use(auth.middleware('Basic'))

app.use(async ctx => {
  const { state } = ctx
  const { credentials } = state
  
  console.log(`Hello, I am ${credenials.name}`)
})

app.listen(3000)
```

## License

Copyright 2020 Michiel van der Velde.

This software is licensed under [the MIT License](LICENSE).
