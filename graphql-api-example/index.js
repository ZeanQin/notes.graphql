const { ApolloServer, gql } = require('apollo-server');

// 1. Schema Definition (The "What")
// Defines the shape of our data and the queries available.
const typeDefs = gql`
  # This is a "Book" type, defining the fields for a book.
  type Book {
    title: String
    author: String
  }

  # The "Query" type lists all the entry points for reading data.
  type Query {
    books: [Book]
  }

  # Input type for creating a new book
  input CreateBookInput {
    title: String!
    author: String!
  }

  # Input type for updating an existing book
  input UpdateBookInput {
    id: ID!
    title: String
    author: String
  }

  # The "Mutation" type lists all the entry points for modifying data.
  type Mutation {
    createBook(input: CreateBookInput!): Book
    updateBook(input: UpdateBookInput!): Book
    deleteBook(id: ID!): Boolean
  }
`;

// 2. Sample Data
// In a real application, this would come from a database or another API.
let books = [
  {
    id: '1',
    title: 'The Awakening',
    author: 'Kate Chopin',
  },
  {
    id: '2',
    title: 'City of Glass',
    author: 'Paul Auster',
  },
];

// 3. Resolvers (The "How")
// This object provides the functions that fetch the data for the schema.
// The structure of the resolver map must match the schema's structure.
const resolvers = {
  Query: {
    books: () => books, // The resolver for the "books" query returns our sample data.
  },
  Mutation: {
    createBook: (parent, { input }) => {
      console.log('Creating book:', input);
      // In a real app, you'd save this to a database and return the new book with an ID
      const newBook = { id: String(books.length + 1), ...input };
      books.push(newBook); // For demonstration, add to array
      return newBook;
    },
    updateBook: (parent, { input }) => {
      console.log('Updating book:', input);
      // In a real app, you'd find and update the book in your database
      const bookIndex = books.findIndex(book => book.id === input.id);
      if (bookIndex > -1) {
        books[bookIndex] = { ...books[bookIndex], ...input }; // For demonstration, update in array
        return books[bookIndex];
      }
      return null; // Or throw an error if not found
    },
    deleteBook: (parent, { id }) => {
      console.log('Deleting book with ID:', id);
      // In a real app, you'd delete the book from your database
      const initialLength = books.length;
      books = books.filter(book => book.id !== id); // For demonstration, filter from array
      return books.length < initialLength; // Return true if a book was deleted
    },
  },
};

// 4. Server Setup
// Create an instance of ApolloServer, passing it the schema and resolvers.
const server = new ApolloServer({ typeDefs, resolvers });

// Start the server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});