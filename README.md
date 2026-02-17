# cod-smart-fetch

A professional, type-safe, and feature-rich React hook for data fetching. It simplifies network requests by handling loading states, errors, data caching, debouncing, and more, all while providing a modern API for both automatic and manual execution.

## Features

- **Built-in State Management**: Automatically handles `isLoading`, `error`, and `data` states.
- **Auto-Fetch**: Trigger requests immediately when a component mounts or dependencies change.
- **Debounce Support**: Native support for debounced requests (perfect for search inputs).
- **Global Configuration**: Set base URLs, default headers, and interceptors once for your entire app.
- **Interceptors**: Powerful request and response interception for logging, auth tokens, or error handling.
- **Smart File Uploads**: Simplified API for uploading files and `FormData`.
- **TypeScript First**: Written in TypeScript with full type inference for request bodies and responses.

## Installation

```bash
npm install cod-smart-fetch
# or
yarn add cod-smart-fetch
```

## Quick Start

### 1. Automatic Fetching (GET)
Ideal for loading data when a component mounts.

```tsx
import { useSmartFetch } from 'cod-smart-fetch';

interface User {
  id: number;
  name: string;
}

const UserProfile = () => {
  const { data, isLoading, error } = useSmartFetch<User>({
    url: 'https://jsonplaceholder.typicode.com/users/1',
    autoFetch: true
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return <div>User: {data?.name}</div>;
};
```

### 2. Manual Execution (POST)
Ideal for form submissions or actions triggered by user interaction.

```tsx
import { useSmartFetch } from 'cod-smart-fetch';

const CreatePost = () => {
  const { post, isLoading } = useSmartFetch();

  const handleSubmit = async () => {
    const response = await post('https://jsonplaceholder.typicode.com/posts', {
      title: 'New Post',
      body: 'This is the content'
    });
    
    if (response) {
      alert('Post Created!');
    }
  };

  return (
    <button onClick={handleSubmit} disabled={isLoading}>
      {isLoading ? 'Creating...' : 'Create Post'}
    </button>
  );
};
```

## Advanced Features

### Global Configuration
You can configure a base URL and global headers (like Authorization tokens) using the `SmartFetchProvider`.

```tsx
// app.tsx
import { SmartFetchProvider } from 'cod-smart-fetch';

const App = () => (
  <SmartFetchProvider config={{
    baseUrl: 'https://api.my-app.com/v1',
    headers: { 
      'Authorization': 'Bearer my-token' 
    }
  }}>
    <MyComponent />
  </SmartFetchProvider>
);
```

### Interceptors
Interceptors allow you to modify requests before they are sent or responses before they are processed. This is useful for logging logic or global error handling (e.g., redirecting to login on 401).

```tsx
<SmartFetchProvider config={{
  baseUrl: 'https://api.my-app.com',
  interceptors: {
    request: async (options) => {
      console.log('Requesting:', options.method, options.url);
      return options;
    },
    response: async (response) => {
      if (response.status === 401) {
        window.location.href = '/login';
      }
      return response;
    }
  }
}}>
  <App />
</SmartFetchProvider>
```

### Debounced Requests (Search)
Easily implement "search-as-you-type" functionality without extra libraries.

```tsx
const [search, setSearch] = useState('');
const { data } = useSmartFetch({
  url: `/search?q=${search}`,
  autoFetch: true,
  debounce: 500 // Wait 500ms after user stops typing
});
```

### File Uploads
The `upload` helper automatically detects files and handles `FormData` conversion and headers for you.

```tsx
const { upload } = useSmartFetch();

const handleUpload = async (file: File) => {
  // Uploads as multipart/form-data
  await upload('/avatars', file);
};
```

### Manual State Updates (Mutate)
You can manually update the cached data or convert it using `mutate`. This is useful for optimistic updates.

```tsx
const { data, mutate } = useSmartFetch({ url: '/api/user', autoFetch: true });

const updateName = () => {
    // Optimistically update the name
    mutate((prev) => ({ ...prev, name: 'John Doe' }), false);
    
    // Config: true to trigger a re-fetch after mutation
};
```

## API Documentation

### `useSmartFetch<T>(options?: UseSmartFetchOptions)`

#### Configuration Options
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `url` | `string` | `undefined` | The endpoint URL. Required if `autoFetch` is true. |
| `method` | `'GET' \| 'POST' ...` | `'GET'` | The HTTP method to use. |
| `headers` | `HeadersInit` | `{}` | Custom headers. merged with global headers. |
| `body` | `any` | `undefined` | The request payload. |
| `autoFetch` | `boolean` | `false` | If true, executes the request immediately on mount. |
| `debounce` | `number` | `undefined` | Milliseconds to delay execution (only for `autoFetch`). |

#### Return Values
| Property | Type | Description |
|----------|------|-------------|
| `data` | `T \| null` | The parsed JSON response. |
| `error` | `Error \| null` | The error object if the request fails. |
| `isLoading` | `boolean` | `true` while a request is pending. |
| `execute` | `(opts) => Promise<T>` | Manually triggers the request with merged options. |
| `get` | `(url, headers?)` | Helper for GET requests. |
| `post` | `(url, body, headers?)` | Helper for POST requests. |
| `put` | `(url, body, headers?)` | Helper for PUT requests. |
| `patch` | `(url, body, headers?)` | Helper for PATCH requests. |
| `remove` | `(url, headers?)` | Helper for DELETE requests. |
| `upload` | `(url, files, name?)` | Helper for file uploads. |
| `mutate` | `(data, revalidate?)` | Manually updates data state. |