# Using Apollo Client with Next.js (App Router)

This guide provides a complete example of how to set up and use Apollo Client to fetch GraphQL data in a Next.js 13+ application using the App Router.

## Step 1: Install Dependencies

First, add the necessary libraries to your project.

```bash
npm install @apollo/client graphql
```

---

## Step 2: Create the Apollo Client Instance

Create a reusable function to instantiate the Apollo Client. This approach is crucial for server-side rendering to ensure each request gets its own client instance.

**File: `lib/apollo-client.js`**

```javascript
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

// This function creates and returns a new Apollo Client instance.
const createApolloClient = () => {
  return new ApolloClient({
    // Configure the connection to your GraphQL server
    link: new HttpLink({
      uri: 'https://api.example.com/graphql', // <-- Replace with your GraphQL endpoint
      // You can add headers here for authentication
      // headers: {
      //   Authorization: `Bearer ${process.env.YOUR_API_TOKEN}`,
      // },
    }),
    // Use an in-memory cache for storing query results
    cache: new InMemoryCache(),
  });
};

export default createApolloClient;
```

---

## Step 3: Create a Client-Side Provider

Since Apollo Client uses React Context, you need a Client Component to act as the provider for your application.

**File: `components/ApolloProviderWrapper.js`**

```javascript
"use client"; // This is a client-side-only component

import { ApolloProvider } from "@apollo/client";
import createApolloClient from "../lib/apollo-client";

// This component wraps its children with the ApolloProvider,
// making the Apollo Client instance available to all descendant components.
export default function ApolloProviderWrapper({ children }) {
  const client = createApolloClient();
  
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
```

---

## Step 4: Add the Provider to the Root Layout

Wrap the root layout with the `ApolloProviderWrapper` to make the client available throughout your entire application.

**File: `app/layout.js`**

```javascript
import ApolloProviderWrapper from '../components/ApolloProviderWrapper';
import './globals.css';

export const metadata = {
  title: 'Next.js with Apollo',
  description: 'Example of using Apollo Client with Next.js',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ApolloProviderWrapper>{children}</ApolloProviderWrapper>
      </body>
    </html>
  );
}
```

---

## Step 5: Fetching Data

You can fetch data on the client for dynamic components or on the server for initial page loads (SSR).

### Step 5.1: Fetching on the Client with `useQuery`

This pattern is ideal for components that need to fetch data based on user interaction or have dynamic variables. It uses the `useQuery` hook and requires the component to be a Client Component (`'use client'`).

**File: `app/page.js` (Client Component Example)**

```javascript
'use client'; // This component uses hooks, so it must be a Client Component.

import { gql, useQuery } from '@apollo/client';

// Define the GraphQL query using the gql template literal.
const GET_USER_QUERY = gql`
  query GetUser($userId: ID!) {
    user(id: $userId) {
      id
      name
      email
      posts {
        title
        publishedAt
      }
    }
  }
`;

export default function HomePage() {
  // useQuery handles the entire lifecycle of the query
  const { loading, error, data } = useQuery(GET_USER_QUERY, {
    variables: { userId: "1" },
  });

  // 1. Handle the loading state
  if (loading) return <p>Loading user profile...</p>;

  // 2. Handle the error state
  if (error) return <p>Error: {error.message}</p>;

  // 3. Render the data
  return (
    <main style={{ padding: '2rem' }}>
      <h1>User Profile</h1>
      <div>
        <h2>{data.user.name}</h2>
        <p>Email: {data.user.email}</p>
      </div>
      <hr />
      <h2>Posts</h2>
      <ul>
        {data.user.posts.map((post, index) => (
          <li key={index}>
            <strong>{post.title}</strong> (Published on {new Date(post.publishedAt).toLocaleDateString()})
          </li>
        ))}
      </ul>
    </main>
  );
}
```

---

### Step 5.2: Fetching on the Server (SSR) with `client.query`

This is the recommended pattern for fetching the initial data for a page. It runs on the server, which improves performance and SEO. This component is a Server Component (the default in the App Router).

**File: `app/page.js` (Server Component Example)**

```javascript
// No 'use client' directive, so this is a Server Component by default.

import { gql } from '@apollo/client';
import createApolloClient from '../lib/apollo-client'; // We reuse our client creation function

// Define the GraphQL query, same as before.
const GET_USER_QUERY = gql`
  query GetUser($userId: ID!) {
    user(id: $userId) {
      id
      name
      email
      posts {
        title
        publishedAt
      }
    }
  }
`;

// The component itself is now an async function.
export default async function HomePage() {
  // 1. Create a new Apollo Client instance for this server-side request.
  const client = createApolloClient();

  // 2. Fetch data directly using the client.query() method.
  // This happens on the server before the page is sent to the browser.
  const { loading, error, data } = await client.query({
    query: GET_USER_QUERY,
    variables: { userId: "1" },
    // You can configure the Next.js cache behavior here
    // context: {
    //   fetchOptions: {
    //     next: { revalidate: 5 },
    //   },
    // },
  });

  // You can handle loading/error states if needed, though for a server-rendered
  // page, you might prefer to show an error page or a fallback UI.
  if (loading) return <p>Loading on server...</p>; // This will likely not be seen by the user
  if (error) return <p>Error: {error.message}</p>;

  // 3. Render the component with the fetched data.
  // The resulting HTML is sent to the client.
  return (
    <main style={{ padding: '2rem' }}>
      <h1>User Profile (Server-Rendered)</h1>
      <div>
        <h2>{data.user.name}</h2>
        <p>Email: {data.user.email}</p>
      </div>
      <hr />
      <h2>Posts</h2>
      <ul>
        {data.user.posts.map((post, index) => (
          <li key={index}>
            <strong>{post.title}</strong> (Published on {new Date(post.publishedAt).toLocaleDateString()})
          </li>
        ))}
      </ul>
    </main>
  );
}
```

---

## Why We Still Need the Provider on the Client Side Even with SSR

Server-Side Rendering (SSR) is fantastic for the initial page load, but as soon as the user starts interacting with the page, the client takes over. The `ApolloProviderWrapper` is the bridge that makes this transition seamless. Here’s why it's essential.

### 1. Hydration: Avoiding a Second Fetch

When the server renders a page with data, Apollo Client automatically puts that data into an in-memory cache. This cache is then passed to the client. "Hydration" is the process where the client-side Apollo Client picks up this pre-populated cache. This prevents the client from having to re-fetch data that the server already got.

**Scenario:** The server fetches a user's name. A client component on the same page also needs that name.

**File: `app/page.js` (Server Component)**
```javascript
// This component fetches data on the server.
import { gql } from '@apollo/client';
import createApolloClient from '../lib/apollo-client';
import WelcomeMessage from '../components/WelcomeMessage'; // A client component

const GET_USER_NAME = gql`
  query GetUser {
    user(id: "1") {
      name
    }
  }
`;

export default async function HomePage() {
  const client = createApolloClient();
  // Data is fetched ONCE on the server. This automatically populates the cache
  // that will be sent to the client.
  await client.query({ query: GET_USER_NAME });

  return (
    <main>
      <h1>Welcome to the App</h1>
      {/* This component will use the cache populated by the server query */}
      <WelcomeMessage />
    </main>
  );
}
```

**File: `components/WelcomeMessage.js` (Client Component)**
```javascript
'use client';

import { gql, useQuery } from '@apollo/client';

const GET_USER_NAME = gql`
  query GetUser {
    user(id: "1") {
      name
    }
  }
`;

export default function WelcomeMessage() { // No more 'initialName' prop
  // This hook runs on the client.
  const { data, loading } = useQuery(GET_USER_NAME);

  // **HYDRATION MAGIC:**
  // Because the server's Apollo Client (which shares the same cache instance
  // during SSR) already fetched this data, the client-side `useQuery` hook
  // finds the data in the cache instantly.
  // `loading` will be `false` on the initial render, and `data` will be populated.
  // NO new network request is made.

  if (loading) return <p>This message will not appear on initial load.</p>;

  // The component renders using the data from the hydrated cache.
  return <p>Hello, {data?.user.name}! The client is now aware of your name.</p>;
}
```

---

### 2. Client-Side Navigation

When a user navigates from one page to another (e.g., via `<Link>`), the transition happens on the client without a full page reload. The `ApolloProvider` ensures the client is ready to fetch any new data required for the destination page.

**Scenario:** The user clicks a link to go from the homepage to their `/account` page.

**File: `app/account/page.js` (Client Component)**
```javascript
'use client';

import { gql, useQuery } from '@apollo/client';

const GET_ACCOUNT_DETAILS = gql`
  query GetAccountDetails {
    account(id: "1") {
      plan
      memberSince
    }
  }
`;

export default function AccountPage() {
  // This hook runs when the user navigates to this page on the client.
  const { data, loading, error } = useQuery(GET_ACCOUNT_DETAILS);

  if (loading) return <p>Loading account details...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h2>Account Details</h2>
      <p>Current Plan: {data.account.plan}</p>
      <p>Member Since: {new Date(data.account.memberSince).toLocaleDateString()}</p>
    </div>
  );
}
```

---

### 3. Mutations and Re-fetching

Any action that changes data (a `mutation`) happens on the client in response to user interaction. The `ApolloProvider` gives the `useMutation` hook the ability to send requests and then intelligently update the cache.

**Scenario:** The user is on their profile page and wants to update their name via a form.

**File: `components/UpdateNameForm.js` (Client Component)**
```javascript
'use client';

import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';

// The mutation to send to the server
const UPDATE_USER_NAME = gql`
  mutation UpdateUserName($newName: String!) {
    updateUser(name: $newName) {
      id
      name // Ask for the new name back
    }
  }
`;

// The query to get the current name
const GET_USER_NAME = gql`
  query GetUser {
    user(id: "1") {
      name
    }
  }
`;

export default function UpdateNameForm() {
  const [name, setName] = useState('');
  
  // Get the current name to display
  const { data: userData } = useQuery(GET_USER_NAME);

  // The useMutation hook provides a function to call the mutation
  const [updateUser, { loading, error }] = useMutation(UPDATE_USER_NAME, {
    // This tells Apollo to automatically re-run the GET_USER_NAME query
    // after the mutation succeeds, ensuring the UI updates everywhere.
    refetchQueries: [{ query: GET_USER_NAME }],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser({ variables: { newName: name } });
    setName('');
  };

  return (
    <div>
      <h3>Current Name: {userData?.user.name}</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter new name"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Name'}
        </button>
        {error && <p>Error: {error.message}</p>}
      </form>
    </div>
  );
}
```