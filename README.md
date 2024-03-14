# Store

## Usage

Install package:

```bash
yarn add pdi-store
```

Use module:

```typescript
import { Store } from 'pdi-store'

export const redisStore = new Store()

await redisStore.initClient(settings.redis)
```
