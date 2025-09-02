# Overview

ФотоКрафт is a full-stack photo product e-commerce application built for creating and selling custom photobooks and photo souvenirs. The application is designed as an online store where users can browse products, use an online editor to create custom photobooks, and place orders. It supports three languages (Russian, Armenian, English) and includes both customer-facing features and administrative functionality.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built with **React + TypeScript + Vite**, utilizing a component-based architecture with modern UI patterns:

- **Routing**: Uses Wouter for lightweight client-side routing
- **State Management**: React Query (TanStack Query) for server state management with local component state for UI interactions
- **UI Framework**: Custom component library built on Radix UI primitives with Tailwind CSS for styling
- **Internationalization**: i18next for multi-language support (Russian, Armenian, English)
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

## Backend Architecture
The backend follows a **REST API architecture** using Express.js:

- **API Layer**: Express.js with route-based organization in `server/routes.ts`
- **Database Layer**: Drizzle ORM as the data access layer with PostgreSQL
- **Authentication**: Replit Auth integration with session-based authentication
- **Middleware**: Custom logging, error handling, and authentication middleware
- **File Structure**: Separation of concerns with dedicated modules for database, storage, and authentication

## Database Design
**PostgreSQL** database with Drizzle ORM providing type-safe database operations:

- **Schema Management**: Centralized schema definitions in `shared/schema.ts` with Drizzle migrations
- **Multi-language Support**: JSONB fields for localized content (names, descriptions)
- **Core Tables**: Users, categories, products, orders with proper relationships
- **Session Storage**: PostgreSQL-based session storage for authentication

## Authentication System
**Replit Auth** integration with role-based access control:

- **Session Management**: PostgreSQL-backed session storage with configurable TTL
- **Authorization**: Role-based access (user/admin) with protected routes
- **Security**: HTTPS-only cookies, CSRF protection, and secure session handling

## Development Tools
**Monorepo structure** with shared types and schemas:

- **Build System**: Vite for frontend bundling, esbuild for backend compilation
- **Type Safety**: Shared TypeScript types between frontend and backend
- **Code Quality**: ESLint, TypeScript strict mode, and consistent file organization
- **Development Experience**: Hot module replacement, error overlays, and comprehensive logging

# External Dependencies

## Core Framework Dependencies
- **React Ecosystem**: React 18 with TypeScript, Vite for development/bundling
- **UI Components**: Radix UI component primitives for accessible, unstyled components
- **Styling**: Tailwind CSS with custom design system and CSS variables
- **Backend Runtime**: Node.js with Express.js framework

## Database & ORM
- **Database**: Neon PostgreSQL (serverless PostgreSQL service)
- **ORM**: Drizzle ORM with migration support and type-safe queries
- **Connection**: @neondatabase/serverless for optimized serverless connections

## Authentication & Session Management
- **Authentication Provider**: Replit Auth (OpenID Connect)
- **Session Storage**: connect-pg-simple for PostgreSQL-backed session storage
- **Passport Integration**: openid-client with Passport.js strategy

## State Management & API
- **Server State**: TanStack React Query for caching, synchronization, and background updates
- **HTTP Client**: Fetch API with custom request wrapper for consistent error handling
- **Form Management**: React Hook Form with Hookform Resolvers for validation integration

## Internationalization
- **i18n Framework**: i18next with react-i18next bindings
- **Language Support**: Built-in support for Russian, Armenian, and English locales
- **Content Management**: JSONB database fields for multilingual content storage

## Development & Build Tools
- **TypeScript**: Full-stack type safety with shared type definitions
- **Build Tools**: Vite (frontend), esbuild (backend production builds)
- **Development Enhancements**: Replit-specific plugins for development environment integration
- **Package Management**: npm with lockfile for dependency consistency

## Utility Libraries
- **Styling Utilities**: clsx and tailwind-merge for conditional CSS classes
- **Validation**: Zod for runtime type validation and schema definition
- **Date Handling**: date-fns for date manipulation and formatting
- **Memoization**: memoizee for caching expensive operations