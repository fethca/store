# Store

## Usage

Install package:

```bash
yarn add @fethcat/store
```

Use module:

```typescript
import { Store } from '@fethcat/store'

export const redisStore = new Store()

await redisStore.initClient(settings.redis)
```
