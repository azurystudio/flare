## flare

```ts
import flare from 'https://deno.gg/flare@v0.1.0'

interface UserSchema {
  name: string
  email?: string
  password?: string
}

const store = new flare<UserSchema>(env.namespace)

await store.set('{key}', {
  name: '{name}' // with autocompletion
})
```

### Features

- `set()`
- `get()`
- `has()`
- `update()`
- `list()`
- `delete()`
