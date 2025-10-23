# RhizomeDB: Long-Term Vision

> **Note**: This document contains aspirational goals and speculative use cases. The core database architecture described in the main README is tractable and achievable. What follows here are longer-term possibilities that may or may not come to fruition. Consider this a manifesto more than a roadmap.

## The Journey

Once more with feeling: I've been starting and rewriting this project many times over the years, but I've got a good feeling about *this* implementation. This isn't just another database - it's a fundamentally different way of thinking about data, state, and collaboration.

## The Bigger Picture: Global Federation

The technical architecture described in the README is designed to support something much larger: different instances of this database can configure pub/sub streams and exchange deltas as they run. I'm really shooting for the moon here, but what I'd love to see is an eventual **globally-federated knowledge graph** where information is created, forked, computed, merged and broadcast freely.

Imagine a world where:
- Every instance can selectively share and sync with other instances
- Schemas flow through the system like data
- Trust is modeled explicitly through author verification
- Conflicts are preserved and resolved contextually
- The graph grows organically without central coordination

This is a decade-plus vision, not a v1 feature. But the architecture is designed to make it possible.

## The Reactor: Compute as Data

The database also has the ability to drive a **compute fabric**. Consider: what if you define some domain objects that represent _functions_ - a function is just a signature with an implementation, right? So you can define a function, have its inputs defined using queries, subscribe to new deltas coming in that satisfy those queries, then trigger the function to execute against the query result. Functions always return new deltas, which in turn get written back out from the reactor into the input stream exposed by the database.

This turns the database into a self-modifying system where:
- Computations are reactive to data changes
- Results feed back into the data stream
- Functions are versioned and provenance-tracked like data
- The entire system becomes a "computational DAO"

This is powerful but complex. It's a separate project that builds on the core database architecture.

## Speculative Use Cases

These are examples of what *could* be built, not what the reference implementation will do out of the box.

### Global Knowledge Graph for AI

Wrap this in an MCP so that every Claude instance had its own local instance, but they can all share knowledge and draw from every new instance that comes online exposing any public data, or private data that's provisioned appropriately.

Imagine an LLM arms race where instead of increasingly bloated weights and parameters because we're trying to front-load "knowledge" into a neural network that hallucinates as a feature, we focused on generating the smallest possible models capable of meaningfully reading and writing from the global knowledge graph.

### Research Collaboration Network

An ideal way for independent researchers to share their findings with each other, not just by publishing academic papers but by making entire datasets available. Imagine being able to pull down some lab's research, instantly having their ontology and findings available, and then adding your own and opening the rhizomatic equivalent of a pull request to share your findings back with the original researchers.

### Decentralized Social Media

A social media fabric where every post you make is to *your local data store first*, and then your publication engine routes it out to the various feeds your social networks are distributed across. No more walled gardens - imagine large social aggregators and custom client-side apps designed to give optimized views into public feeds without a company in the middle trying to take a cut.

### Personal Data Ownership

Personal quantified self stuff, everything from health to finance, but you can easily generate reports to share with doctors or accountants just by pulling down helpful HyperSchemas. Your data lives in your instance, you control what gets shared.

### Self-Modifying GraphQL

A GraphQL engine where the schema assembles itself from deltas, and includes a mutation *for itself* so that as you interact with the schema you can tune it. Pushing new deltas up updates the hyperview, which in turn generates a new snapshot view, which you can then send your next query against.

## Why This Matters

The traditional database world assumes:
- Centralized authority
- Schema rigidity
- Single source of truth
- Immediate consistency
- Clear ownership boundaries

The rhizomatic approach embraces:
- Distributed authority
- Schema flexibility
- Multiple concurrent truths
- Eventual consistency
- Fluid collaboration

This isn't just a technical shift - it's a philosophical one. We're building tools for a more decentralized, collaborative, and resilient digital infrastructure.

## Caveat Emptor

These are dreams. The core database is real and tractable. Everything in this document is aspirational and speculative. Build the foundation first, then see where it leads.
