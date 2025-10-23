# RhizomeDB Specification
This document contains a platform-and-language agnostic definition of the rhizomatic database. The intention is to allow anyone who follows this spec to be able to interop with any other compliant implmentation.

The fundamental simplicity of this model is that as long as you have a consistent implementation of the `Delta` schema you should at minimum be able to share JSON feeds with any existing implementation.