# 🔷 Odin Language — dev-2026-04
## Complete Advanced Guide + All Breaking Changes

---

## 📣 Part 1: What's New & What Broke

### 🆕 dev-2026-04 (April 3, 2026) — Latest Release
The headline new language feature is **Fixed Capacity Dynamic Arrays** — a new syntax `[dynamic; N]T` that creates a dynamic array with a fixed upper capacity bound known at compile time. Additional improvements include LLVM 22 initial support, new `intrinsics.type_field_bit_offset` and `intrinsics.type_field_bit_size` builtins, removal of the Tilde backend, and new packages `core:crypto/argon2id`, `vendor:windows/wasapi`, and `vendor:sdl3/mixer`. [github](https://github.com/odin-lang/Odin/releases/tag/dev-2026-04)

```odin
// NEW in 2026-04: Fixed Capacity Dynamic Array
buf: [dynamic; 64]byte           // dynamic array, max 64 bytes, stack-backed
append(&buf, 'H', 'i', '!')      // works like normal dynamic array
// if you exceed N=64, it panics rather than heap-reallocating
```

---

### 🆕 dev-2026-03 (March 4, 2026) — Major Breaking Release
`core:os` has been replaced with the newly improved and rewritten v2, previously available at `core:os/os2`. The old `core:os` implementation remains available at `core:os/old` until Q3 2026. `core:sys/info` changed API from globals to calls `[BREAKING]`. [GitHub](https://github.com/odin-lang/Odin/releases/tag/dev-2026-03)

```odin
// OLD — broken as of dev-2026-03
data, ok := os.read_entire_file("file.txt")

// NEW — explicit allocator required
data, err := os.read_entire_file("file.txt", context.allocator)
defer delete(data)

// OLD — raw Handle
handle: os.Handle

// NEW — pointer to File
file, err := os.open("file.txt")  // returns ^os.File
defer os.close(file)
```

---

### 🆕 dev-2026-02 (Feb 4, 2026) — `using` Opt-In & New Directives
`using` as a statement and procedure parameter modifier is now an opt-in feature on a per-file basis rather than on by default. Place `#+feature using-stmt` at the top of any file that needs it. `using` on struct fields still works as before. Also added: `struct #simple` directive for forcing simple comparison. [GitHub](https://github.com/odin-lang/Odin/releases/tag/dev-2026-02)

```odin
// Need to add this to the TOP of any file using `using` as a statement
#+feature using-stmt

package main

Pos :: struct { x, y: f32 }
Entity :: struct {
    using pos: Pos,   // ✅ using on struct fields — always works, no opt-in needed
    health: int,
}

// using as a STATEMENT — needs #+feature using-stmt
foo :: proc(e: Entity) {
    using e           // ✅ only works if #+feature using-stmt is at file top
    fmt.println(x, y)
}
```

---

### 🆕 dev-2026-01 / Q1 2026 — Big Language Additions

Key Q1 2026 changes:
- **`chacha8rand`** is now the default `context.random_generator` — **breaking** since output for a given seed differs from previous PCG64
- **`struct #all_or_none`** — struct literals must have all or none named fields set
- **`string16` and `cstring16`** — native UTF-16 string types
- **`#must_tail`** directive and new calling conventions `"preserve/none"`, `"preserve/most"`, `"preserve/all"` for tail call optimization
- **LTO support** via `-lto:thin` and `-lto:thin-files`
- **License changed** from BSD 3-clause to zlib
- New packages: `core:nbio`, `core:container/xar`, `core:container/handle_map`, `core:crypto/ecdh` [Odin Programming Language](https://odin-lang.org/news/newsletter-2026-q1/)

---

### 💥 Full Breaking Changes Summary

| Version | What Broke | Migration |
|---|---|---|
| 2026-04 | Tilde backend removed | Use LLVM or C backend |
| 2026-03 | `core:os` fully replaced | Use new API or `core:os/old` temporarily |
| 2026-03 | `core:sys/info` globals → calls | Call accessor functions instead |
| 2026-02 | `using` as statement is opt-in | Add `#+feature using-stmt` to file |
| 2026-01 | `context.random_generator` changed | Same seed gives different output now |
| 2026-01 | `core:os` requires explicit allocator | Pass `context.allocator` to procedures |

---

## 🧠 Part 2: Odin Syntax — Key Concepts Explained

Before advanced topics, here are the syntax things that trip people up:

```odin
package main

import "core:fmt"

// :: means CONSTANT declaration (compile-time known)
MAX :: 100
PI  :: 3.14159

// : Type = means typed variable
x: int = 10

// := means inferred type variable
y := 42              // y is int
name := "Odin"       // name is string

// Procedure declaration — NOT func, NOT fn, it's proc
greet :: proc(name: string) {
    fmt.println("Hello,", name)
}

// Procedure with return value
add :: proc(a, b: int) -> int {
    return a + b
}

// Multiple return values — very common in Odin
divide :: proc(a, b: f64) -> (result: f64, ok: bool) {
    if b == 0 { return 0, false }
    return a / b, true
}

main :: proc() {
    result, ok := divide(10.0, 3.0)
    if ok {
        fmt.println(result)
    }

    // defer runs at end of scope — like Go
    data := make([]int, 10)
    defer delete(data)

    // when = compile-time if (like #if in C)
    when ODIN_OS == .Windows {
        fmt.println("Windows!")
    } else {
        fmt.println("Not Windows")
    }
}
```

---

## 🎓 Part 3: 15 Advanced Concepts

---

### 1. 🌐 The Implicit Context System — Odin's Superpower

In each scope, there is an implicit value named `context`. This context variable is local to each scope and is implicitly passed by pointer to any procedure call in that scope. The main purpose of the implicit context system is for the ability to intercept third-party code and libraries and modify their functionality — such as modifying how a library allocates memory or logs something. [Odin Programming Language](https://odin-lang.org/)

```odin
package main

import "core:fmt"
import "core:mem"

main :: proc() {
    // context is always available — no need to declare it
    fmt.println("allocator:", context.allocator)

    // Override allocator for a scope block
    // ALL allocations inside this block (including in called procs) use arena
    arena: mem.Arena
    mem.arena_init(&arena, make([]byte, 1024 * 1024))
    defer mem.arena_destroy(&arena)
    defer free_all(context.allocator) // free everything at once

    {
        context.allocator = mem.arena_allocator(&arena)
        // now make(), new(), append() all use the arena
        data := make([]int, 100)   // uses arena
        _ = data
    }

    // context fields you can customise:
    // context.allocator       — memory allocation
    // context.temp_allocator  — temporary scratch memory
    // context.logger          — logging
    // context.random_generator — random numbers (chacha8rand by default in 2026)
    // context.user_ptr        — any custom data
    // context.user_index      — any integer
}
```

**📝 Exercises:**
1. Write a procedure `with_temp_allocator(body: proc())` that sets `context.temp_allocator` to a fresh arena, calls `body`, then frees the arena.
2. Implement a custom logger that prepends timestamps, assign it to `context.logger`, and verify all `log.info` calls use it.
3. Pass custom per-thread data via `context.user_ptr` — create a struct `ThreadData` with a request ID and access it inside a deeply nested call chain without passing it explicitly.

---

### 2. 🧬 Parametric Polymorphism (Generics with `$`)

Odin uses `$T` for compile-time type parameters — no angle brackets, no complexity:

```odin
package main

import "core:fmt"

// $T means "T is a compile-time type parameter"
// The proc is specialised for each T at compile time
stack_push :: proc(stack: ^[dynamic]$T, val: T) {
    append(stack, val)
}

stack_pop :: proc(stack: ^[dynamic]$T) -> (val: T, ok: bool) {
    if len(stack) == 0 { return {}, false }
    val = stack[len(stack)-1]
    (stack^) = stack[:len(stack)-1]
    return val, true
}

// Generic struct using $T
Queue :: struct($T: typeid) {
    items: [dynamic]T,
}

queue_push :: proc(q: ^Queue($T), val: T) {
    append(&q.items, val)
}

queue_pop :: proc(q: ^Queue($T)) -> (T, bool) {
    if len(q.items) == 0 { return {}, false }
    val := q.items[0]
    // shift remaining items left (simple implementation)
    for i in 1..<len(q.items) {
        q.items[i-1] = q.items[i]
    }
    resize(&q.items, len(q.items)-1)
    return val, true
}

// Constrain T — only allow numeric types
sum_slice :: proc(s: []$T) -> T where intrinsics.type_is_numeric(T) {
    result: T
    for v in s { result += v }
    return result
}

main :: proc() {
    // Integer stack
    int_stack: [dynamic]int
    defer delete(int_stack)
    stack_push(&int_stack, 10)
    stack_push(&int_stack, 20)
    stack_push(&int_stack, 30)
    if val, ok := stack_pop(&int_stack); ok {
        fmt.println("popped:", val) // 30
    }

    // Queue of strings
    q: Queue(string)
    defer delete(q.items)
    queue_push(&q, "first")
    queue_push(&q, "second")
    if val, ok := queue_pop(&q); ok {
        fmt.println("dequeued:", val) // first
    }

    nums := []f64{1.5, 2.5, 3.0}
    fmt.println("sum:", sum_slice(nums)) // 7.0
}
```

**📝 Exercises:**
1. Write a generic `min_max(s: []$T) -> (min, max: T)` procedure with a `where` constraint that T supports `<` comparison.
2. Build a generic `Result($T: typeid)` struct with `.value: T` and `.err: string`, plus `ok()`, `unwrap()`, and `map($U, proc(T) -> U) -> Result(U)` procedures.
3. Create a generic `BoundedArray($T: typeid, $N: int)` backed by `[N]T` with `push`, `pop`, and `len` procedures, with compile-time capacity check.

---

### 3. 📦 Union Types & Type Switches

Odin unions are untagged by default — fast, C-compatible. For safety use tagged unions:

```odin
package main

import "core:fmt"

// Tagged union — discriminated union (safe)
Token :: union {
    int,
    f64,
    string,
    bool,
}

// Struct wrapping a union with explicit tag
Expr :: union {
    Expr_Num,
    Expr_Add,
    Expr_Neg,
}

Expr_Num :: struct { value: f64 }
Expr_Add :: struct { left, right: ^Expr }
Expr_Neg :: struct { operand: ^Expr }

eval :: proc(e: ^Expr) -> f64 {
    // type switch — exhaustive matching on union variants
    switch v in e^ {
    case Expr_Num:
        return v.value
    case Expr_Add:
        return eval(v.left) + eval(v.right)
    case Expr_Neg:
        return -eval(v.operand)
    }
    unreachable()
}

// Untagged union — like C, no discriminator overhead
Bits :: union #no_nil {
    as_u32: u32,
    as_f32: f32,
    as_bytes: [4]u8,
}

main :: proc() {
    // Tagged union type switch
    tokens := []Token{42, 3.14, "hello", true}
    for tok in tokens {
        switch v in tok {
        case int:    fmt.println("int:", v)
        case f64:    fmt.println("f64:", v)
        case string: fmt.println("str:", v)
        case bool:   fmt.println("bool:", v)
        }
    }

    // Type assertion — single variant
    tok: Token = "world"
    if s, ok := tok.(string); ok {
        fmt.println("got string:", s)
    }

    // Untagged union for bit manipulation
    b: Bits
    b.as_f32 = 1.0
    fmt.printf("f32 1.0 as u32: %08x\n", b.as_u32) // 3f800000
}
```

**📝 Exercises:**
1. Build an `AST :: union { Literal, BinOp, UnaryOp, Ident }` and write a `pretty_print` procedure using type switches.
2. Implement a JSON value type `Json :: union { Null, bool, f64, string, []Json, map[string]Json }` with `marshal` and `unmarshal` procedures.
3. Write an event system: `Event :: union { MouseClick, KeyPress, WindowResize }` with a dispatcher that routes each event to the correct handler procedure.

---

### 4. 🔐 Bit Fields — Hardware-Level Layout

```odin
package main

import "core:fmt"

// bit_field — precise bit-level struct layout, hardware-perfect
// Syntax: field_name: Type | bit_count
IP_Header :: bit_field u160 {
    version:         u8  | 4,
    ihl:             u8  | 4,
    dscp:            u8  | 6,
    ecn:             u8  | 2,
    total_length:    u16 | 16,
    identification:  u16 | 16,
    flags:           u8  | 3,
    fragment_offset: u16 | 13,
    ttl:             u8  | 8,
    protocol:        u8  | 8,
    checksum:        u16 | 16,
    src_ip:          u32 | 32,
    dst_ip:          u32 | 32,
}

// Registers — common in embedded/OS work
CPU_Flags :: bit_field u8 {
    carry:    bool | 1,
    zero:     bool | 1,
    overflow: bool | 1,
    negative: bool | 1,
    _unused:  u8   | 4,
}

// NEW in 2026-04: get bit offset and size at compile time
get_flag_info :: proc() {
    offset := intrinsics.type_field_bit_offset(CPU_Flags, "zero")
    size   := intrinsics.type_field_bit_size(CPU_Flags, "zero")
    fmt.printf("zero: offset=%d bits, size=%d bits\n", offset, size)
}

main :: proc() {
    hdr := IP_Header{
        version   = 4,
        ihl       = 5,
        ttl       = 64,
        protocol  = 6,    // TCP
        src_ip    = 0xC0A80101, // 192.168.1.1
        dst_ip    = 0xC0A80102,
    }
    fmt.println("version:", hdr.version)
    fmt.println("ttl:", hdr.ttl)
    fmt.println("size:", size_of(IP_Header), "bytes") // 20

    flags: CPU_Flags
    flags.zero  = true
    flags.carry = true
    fmt.printf("flags as u8: %08b\n", transmute(u8)flags)

    get_flag_info()
}
```

**📝 Exercises:**
1. Model a USB HID descriptor as a `bit_field`. Write `encode(desc: HID_Descriptor) -> [8]byte` and `decode(data: [8]byte) -> HID_Descriptor`.
2. Create a 32-bit `RGBA` bit_field with `r,g,b,a: u8 | 8` and write `lerp(a, b: RGBA, t: f32) -> RGBA`.
3. Build a RISC-V R-type instruction encoding as `bit_field u32` and write a disassembler that decodes it to a human-readable string.

---

### 5. 🗃️ SOA (Structure of Arrays) — Data-Oriented Design

One of Odin's unique features — transforming AoS to SoA at the type level:

```odin
package main

import "core:fmt"

// Normal Array of Structs (AoS) — bad for SIMD/cache
Particle_AoS :: struct {
    x, y, z:    f32,
    vx, vy, vz: f32,
    mass:        f32,
}

// SOA transform — compiler arranges as separate arrays per field
// All x values contiguous, all y values contiguous, etc.
// PERFECT for SIMD — no stride, no waste
#soa particles: [1000]Particle_AoS  // soa storage

// Or with dynamic:
Particles :: #soa [dynamic]Particle_AoS

update_positions :: proc(ps: ^Particles, dt: f32) {
    // Access via soa_zip for parallel iteration
    for &p in ps {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.z += p.vz * dt
    }
}

main :: proc() {
    ps: Particles
    defer delete(ps)

    // Append works normally
    append(&ps, Particle_AoS{x=1, y=2, z=3, vx=0.1, vy=0.0, vz=0.0, mass=1.0})
    append(&ps, Particle_AoS{x=4, y=5, z=6, vx=0.0, vy=0.1, vz=0.0, mass=2.0})

    update_positions(&ps, 0.016) // dt for 60fps

    // Access individual fields
    fmt.println("particle 0 x:", ps[0].x)
    fmt.println("particle 1 y:", ps[1].y)

    // soa_zip — efficient parallel access to multiple fields
    for x, y, z in soa_zip(ps_x = ps.x, ps_y = ps.y, ps_z = ps.z) {
        fmt.printf("pos: (%.2f, %.2f, %.2f)\n", x, y, z)
    }
}
```

**📝 Exercises:**
1. Write a particle simulation with `#soa [dynamic]Particle` — benchmark it against a normal `[dynamic]Particle` array for a loop over 100k particles updating positions.
2. Create an ECS-style `Components :: #soa [dynamic]struct{pos: [2]f32, vel: [2]f32, health: f32}` and write `system_move` and `system_damage` that iterate efficiently.
3. Build a `sort_soa` function using `slice.sort_by` that sorts an `#soa` array by one of its fields (e.g. by `health` descending).

---

### 6. 🔄 Procedure Overloading with Procedure Groups

Odin has explicit overloading via procedure groups — no implicit magic:

```odin
package main

import "core:fmt"

// Individual procedures
print_int    :: proc(v: int)    { fmt.println("int:",    v) }
print_f32    :: proc(v: f32)    { fmt.println("f32:",    v) }
print_string :: proc(v: string) { fmt.println("string:", v) }
print_bool   :: proc(v: bool)   { fmt.println("bool:",   v) }

// Procedure group — explicit dispatch table
print :: proc { print_int, print_f32, print_string, print_bool }

// Generic math example
abs_int :: proc(v: int)  -> int  { return v if v >= 0 else -v }
abs_f32 :: proc(v: f32)  -> f32  { return v if v >= 0 else -v }
abs_f64 :: proc(v: f64)  -> f64  { return v if v >= 0 else -v }

abs :: proc { abs_int, abs_f32, abs_f64 }

// Serialize overloading example
serialize_int    :: proc(b: ^[dynamic]byte, v: int)    { append(b, ..transmute([8]byte)v[:]) }
serialize_string :: proc(b: ^[dynamic]byte, v: string) {
    // write length prefix then bytes
    append(b, ..transmute([8]byte)len(v)[:])
    append(b, ..transmute([]byte)v)
}

serialize :: proc { serialize_int, serialize_string }

main :: proc() {
    print(42)
    print(3.14)
    print("hello")
    print(true)

    fmt.println(abs(-99))    // calls abs_int
    fmt.println(abs(-3.14))  // calls abs_f32

    buf: [dynamic]byte
    defer delete(buf)
    serialize(&buf, 12345)
    serialize(&buf, "odin")
    fmt.println("bytes:", len(buf))
}
```

**📝 Exercises:**
1. Write a `to_string` procedure group that works on `int`, `f64`, `bool`, and custom struct types — each variant returns a heap-allocated string.
2. Build a `hash` procedure group for `string`, `int`, `[]byte`, and a custom `Point` struct using FNV-1a.
3. Create an `equal` procedure group that does deep equality for slices, maps, and basic types, demonstrating the benefit of explicit dispatch vs hidden overloading.

---

### 7. 💾 Memory Allocators — Explicit Control

```odin
package main

import "core:fmt"
import "core:mem"

main :: proc() {
    // ── Tracking Allocator — detects leaks ──────────────────
    track: mem.Tracking_Allocator
    mem.tracking_allocator_init(&track, context.allocator)
    defer {
        if len(track.allocation_map) > 0 {
            fmt.eprintln("LEAKS:")
            for _, v in track.allocation_map {
                fmt.eprintfln("  %v: %d bytes", v.location, v.size)
            }
        }
        mem.tracking_allocator_destroy(&track)
    }
    context.allocator = mem.tracking_allocator(&track)

    // ── Arena Allocator — bump allocator, free-all at once ──
    arena: mem.Arena
    buf: [4096]byte
    mem.arena_init(&arena, buf[:])
    arena_alloc := mem.arena_allocator(&arena)

    {
        context.allocator = arena_alloc
        slice1 := make([]int, 10)   // from arena
        slice2 := make([]f32, 10)   // from arena
        _ = slice1; _ = slice2
        // No individual frees needed
        fmt.println("arena used:", arena.offset, "bytes")
    }
    // Free entire arena at once
    free_all(arena_alloc)
    fmt.println("arena after reset:", arena.offset, "bytes")

    // ── Temp Allocator — global scratch space ────────────────
    // temp_allocator is a ring buffer — auto resets each frame in game loops
    temp_str := fmt.tprintf("frame %d data", 42) // tprintf uses temp_allocator
    fmt.println(temp_str)
    free_all(context.temp_allocator) // reset temp allocator

    // ── Explicit allocator per call ───────────────────────────
    data, err := make([]byte, 256, context.allocator)
    if err != nil { fmt.eprintln("alloc failed:", err); return }
    defer delete(data)
    data[0] = 0xFF
}
```

**📝 Exercises:**
1. Write a `scratch_arena` helper that takes a procedure value, creates a 64KB arena, sets it as `context.allocator`, calls the proc, then frees the arena.
2. Implement a `Pool_Allocator($T: typeid, $N: int)` that pre-allocates N slots of type T and recycles them on free.
3. Build a logging allocator wrapper that wraps any `mem.Allocator` and prints every allocation, resize, and free to stderr with caller location info using `#caller_location`.

---

### 8. ⚙️ The `when` Directive — Compile-Time Branching

```odin
package main

import "core:fmt"
import "core:intrinsics"

// when = evaluated at compile time — zero overhead
SIMD_ENABLED :: true

// Platform-specific code
platform_name :: proc() -> string {
    when ODIN_OS == .Windows { return "Windows" }
    else when ODIN_OS == .Linux   { return "Linux"   }
    else when ODIN_OS == .Darwin  { return "macOS"   }
    else                          { return "Unknown" }
}

// Arch-specific SIMD
fast_sum :: proc(data: []f32) -> f32 {
    when intrinsics.has_target_feature("avx2") && SIMD_ENABLED {
        // AVX2 path — 8 floats at a time
        Vec8 :: #simd[8]f32
        n    := len(data) / 8
        acc  := Vec8{0,0,0,0,0,0,0,0}
        for i in 0..<n {
            chunk := (^Vec8)(raw_data(data[i*8:]))^
            acc += chunk
        }
        result := acc[0]+acc[1]+acc[2]+acc[3]+acc[4]+acc[5]+acc[6]+acc[7]
        for i in n*8..<len(data) { result += data[i] }
        return result
    } else {
        result: f32
        for v in data { result += v }
        return result
    }
}

// Compile-time size assertion
MAX_COMPONENTS :: 64
#assert(MAX_COMPONENTS <= 64, "Too many components for 64-bit bitmask")

// Type-level when
make_default :: proc($T: typeid) -> T {
    when T == int    { return 0      }
    else when T == string { return ""    }
    else when T == bool   { return false }
    else                  { return {}    }
}

main :: proc() {
    fmt.println("Platform:", platform_name())
    data := []f32{1,2,3,4,5,6,7,8,9,10}
    fmt.println("Sum:", fast_sum(data))
    fmt.println("default int:", make_default(int))
    fmt.println("default str:", make_default(string))
}
```

**📝 Exercises:**
1. Write a `debug_assert` macro using `when ODIN_DEBUG` that only checks the condition in debug builds.
2. Create a `platform_path_sep :: proc() -> byte` that returns `/` on Unix and `\\` on Windows using `when ODIN_OS`.
3. Build a `SIMD_Vec(comptime N: int, T: typeid)` type that uses `#simd[N]T` when available and falls back to `[N]T` via `when intrinsics.has_target_feature(...)`.

---

### 9. 🔁 `defer` & `defer if` — Guaranteed Cleanup

```odin
package main

import "core:fmt"
import "core:os"

// defer runs at END of scope — in REVERSE order (LIFO)
// This guarantees cleanup even on error paths
open_and_process :: proc(path: string) -> (ok: bool) {
    file, err := os.open(path)
    if err != nil {
        fmt.eprintln("open error:", err)
        return false
    }
    defer os.close(file)   // guaranteed close — even if we return early

    data, read_err := os.read_entire_file_from_handle(file, context.allocator)
    if read_err != nil {
        fmt.eprintln("read error:", read_err)
        return false   // file still closed via defer
    }
    defer delete(data)  // guaranteed free

    fmt.println("read", len(data), "bytes")
    return true
}

// defer with a block — multiple cleanup statements
resource_demo :: proc() {
    a := make([]int, 10)
    b := make([]f32, 10)
    c := make(map[string]int)

    // Group cleanup — reverse order: c, b, a
    defer {
        delete(c)
        delete(b)
        delete(a)
    }

    a[0] = 1
    b[0] = 1.0
    c["key"] = 42
    fmt.println(a[0], b[0], c["key"])
}

// defer with a named return — useful pattern
get_data :: proc() -> (data: []byte, err: os.Error) {
    file, file_err := os.open("config.txt")
    if file_err != nil { return nil, file_err }
    defer os.close(file)

    buf, read_err := os.read_entire_file_from_handle(file, context.allocator)
    if read_err != nil { return nil, read_err }
    return buf, nil
}

main :: proc() {
    resource_demo()
    // defer ordering demo
    defer fmt.println("1: last")
    defer fmt.println("2: second")
    defer fmt.println("3: first")
    fmt.println("0: main body")
    // prints: 0, 3, 2, 1
}
```

**📝 Exercises:**
1. Write a transaction system where `begin_tx() -> Tx` and `defer commit_or_rollback(&tx)` ensures a transaction always finishes even on error paths.
2. Build a `timer :: proc(name: string) -> proc()` that records start time and returns a defer-able cleanup proc that prints elapsed time.
3. Implement a mutex lock/unlock pattern using defer to guarantee unlock even when the protected code panics.

---

### 10. 🏗️ `struct #all_or_none` & `struct #simple` (New in 2026)

`struct #all_or_none` requires that struct literals have all or none of their fields set when declaring a compound literal with named fields. `struct #simple` forces a struct to use simple comparison (like `memcmp`) even if its fields are floats, ignoring NaN/±0 edge cases. [Odin Programming Language](https://odin-lang.org/news/newsletter-2026-q1/)

```odin
package main

import "core:fmt"

// #all_or_none — enforces fully specified or zero-initialized literals
Config :: struct #all_or_none {
    host:    string,
    port:    int,
    timeout: int,
    retries: int,
}

// #simple — fast memcmp equality, ignores float NaN/±0 edge cases
Vec3 :: struct #simple {
    x, y, z: f32,
}

// Fixed Capacity Dynamic Array — NEW in dev-2026-04
// [dynamic; N]T — dynamic array with stack-backed fixed max capacity
build_cmd :: proc() -> [dynamic; 32]string {
    args: [dynamic; 32]string
    append(&args, "odin")
    append(&args, "build")
    append(&args, ".")
    return args
}

main :: proc() {
    // Must provide ALL fields or NONE — partial is compile error
    c1 := Config{}  // ✅ all zero
    c2 := Config{   // ✅ all fields provided
        host    = "localhost",
        port    = 8080,
        timeout = 30,
        retries = 3,
    }
    // Config{host = "localhost"} // ❌ compile error — partial init!

    // #simple enables == comparison efficiently
    a := Vec3{1, 2, 3}
    b := Vec3{1, 2, 3}
    fmt.println("equal:", a == b)   // fast memcmp

    // Fixed capacity dynamic array
    cmd := build_cmd()
    fmt.println("cmd:", cmd[:])

    _ = c1; _ = c2
}
```

**📝 Exercises:**
1. Define a `DB_Config :: struct #all_or_none` with 6 required fields. Write a `parse_env_config() -> DB_Config` that reads from environment variables and must set all fields.
2. Create a physics `AABB :: struct #simple { min, max: [3]f32 }` and write `intersects(a, b: AABB) -> bool` and `contains(box: AABB, point: [3]f32) -> bool`.
3. Use `[dynamic; 16]Event` as a fixed-capacity event queue with push/pop, demonstrating what happens when capacity is exceeded.

---

### 11. 🔗 Multiple Return Values & Named Returns

```odin
package main

import "core:fmt"
import "core:strconv"

// Multiple return values — Odin's error handling idiom
parse_int :: proc(s: string) -> (value: int, ok: bool) {
    v, parse_ok := strconv.parse_int(s, 10)
    return v, parse_ok
}

// Named returns — can be used for documentation and early return
http_get :: proc(url: string) -> (body: string, status: int, err: string) {
    if url == "" {
        err = "empty URL"
        return  // named return — returns zero values for body and status
    }
    // ... actual HTTP call
    return "response body", 200, ""
}

// Multiple assignment with _
parse_config :: proc(data: string) -> (host: string, port: int, ok: bool) {
    // parse host:port
    host  = "localhost"
    port  = 8080
    ok    = true
    return
}

// Unpacking in loops and conditions
results := [][2]int{{1,2}, {3,4}, {5,6}}

main :: proc() {
    // Standard multiple return
    if val, ok := parse_int("42"); ok {
        fmt.println("parsed:", val)
    }

    // Discard with _
    _, port, ok := parse_config("localhost:8080")
    if ok { fmt.println("port:", port) }

    // Named returns as documentation
    body, status, err := http_get("https://example.com")
    if err != "" {
        fmt.eprintln("error:", err)
        return
    }
    fmt.println(status, len(body))

    // Multiple assignment in for loop
    for pair in results {
        a, b := pair[0], pair[1]
        fmt.println(a, "+", b, "=", a+b)
    }
}
```

**📝 Exercises:**
1. Write `parse_rgb(s: string) -> (r, g, b: u8, ok: bool)` that parses `"#RRGGBB"` hex strings.
2. Build a `try` helper: `try :: proc(val: $T, ok: bool, msg: string) -> T` that panics with `msg` if `!ok` — useful for wrapping operations in a chain.
3. Create a `measure :: proc(f: proc() -> $T) -> (result: T, ns: i64)` that times any no-arg procedure using `time.tick_now()`.

---

### 12. 🧵 `core:nbio` — Non-Blocking I/O (New in 2026)

`core:nbio` implements a non-blocking I/O and event loop abstraction over platform-specific APIs: IOCP on Windows, io_uring on Linux, kQueue on Darwin/BSD. All major targets are supported. [odin-lang](https://odin-lang.org/news/newsletter-2026-q1/)

```odin
package main

import "core:fmt"
import "core:net"
import "core:nbio"
import "core:os"

// Basic nbio event loop pattern
main :: proc() {
    // Initialize the IO loop
    io: nbio.IO
    err := nbio.init(&io)
    if err != nil {
        fmt.eprintln("nbio init failed:", err)
        os.exit(1)
    }
    defer nbio.destroy(&io)

    // Read a file asynchronously
    file, open_err := os.open("data.txt")
    if open_err != nil {
        fmt.eprintln("open:", open_err)
        return
    }
    defer os.close(file)

    buf := make([]byte, 4096)
    defer delete(buf)

    // Submit async read — callback fires when complete
    nbio.read(&io, file, buf, nil, proc(userdata: rawptr, n: int, err: os.Error) {
        if err != nil {
            fmt.eprintln("read error:", err)
            return
        }
        fmt.printf("read %d bytes\n", n)
        fmt.println(string((^[]byte)(userdata)^[:n]))
    }, &buf)

    // Run the event loop until all operations complete
    for nbio.num_waiting(&io) > 0 {
        nbio.tick(&io) or_break
    }
}
```

**📝 Exercises:**
1. Write an nbio-based file copy that reads a source file in 4KB chunks and writes each chunk to a destination file asynchronously.
2. Build a simple HTTP status checker using `core:net` and `core:nbio` that issues 5 concurrent requests and reports back their status codes.
3. Implement a file watcher that polls for changes to a directory and prints a notification when any file is modified.

---

### 13. 🗺️ `core:container/handle_map` — Generational Indices (New in 2026)

Package `core:container/handle_map` implements generational-index based handle containers. Elements never invalidate other handles on remove, and dangling handle access is detected via generation counters. [odin-lang](https://odin-lang.org/news/newsletter-2026-q1/)

```odin
package main

import "core:fmt"
import hm "core:container/handle_map"

// Generational handle — safe, stable references
Handle :: hm.Handle32

Entity :: struct {
    handle: Handle,
    name:   string,
    pos:    [2]f32,
    health: f32,
}

main :: proc() {
    // Static handle map — fixed capacity, stack-friendly
    entities: hm.Static_Handle_Map(256, Entity, Handle)

    // Add entities
    h_player := hm.add(&entities, Entity{name = "player", pos = {0, 0}, health = 100})
    h_enemy1 := hm.add(&entities, Entity{name = "enemy1", pos = {5, 3}, health = 50})
    h_enemy2 := hm.add(&entities, Entity{name = "enemy2", pos = {-2, 7}, health = 30})

    // Safe access — returns ok=false for stale/invalid handles
    if e, ok := hm.get(&entities, h_player); ok {
        fmt.println("player health:", e.health)
        e.health -= 10   // mutate via pointer
    }

    // Remove — the handle becomes stale, other handles unaffected
    hm.remove(&entities, h_enemy1)

    // h_enemy1 is now stale — safe to detect
    if _, ok := hm.get(&entities, h_enemy1); !ok {
        fmt.println("enemy1 handle is stale — correctly detected")
    }

    // Reuse — new entity gets same slot but different generation
    h_new := hm.add(&entities, Entity{name = "new_guy", pos = {1, 1}, health = 75})
    fmt.println("h_enemy1 == h_new?", h_enemy1 == h_new) // false — different gen

    // Iterate all live entities
    it := hm.iterator_make(&entities)
    for e, h in hm.iterate(&it) {
        fmt.printf("  [%v] %s @ (%.1f, %.1f) hp=%.0f\n",
            h, e.name, e.pos[0], e.pos[1], e.health)
    }

    // Dynamic variant — heap allocated, growable
    dyn_entities: hm.Dynamic_Handle_Map(Entity, Handle)
    hm.dynamic_init(&dyn_entities, context.allocator)
    defer hm.dynamic_destroy(&dyn_entities)

    _ = h_enemy2; _ = h_new
}
```

**📝 Exercises:**
1. Build a simple ECS using `handle_map` for entities, with separate arrays for `Transform`, `Velocity`, and `Health` components mapped by handle.
2. Write a `spawn` / `despawn` system where handles are stored in a queue — demonstrate that despawning an entity makes its handle stale without affecting others.
3. Implement a scene graph using `handle_map` where each entity stores its parent's `Handle` — traverse the hierarchy with a BFS/DFS.

---

### 14. ⚡ `#must_tail` & Tail Call Optimization (New in 2026)

`#must_tail` forces a tail call optimization and produces a compile error if it can't be done. Combined with `"preserve/none"` calling convention, it enables zero-overhead interpreter loops and recursive state machines. [odin-lang](https://odin-lang.org/news/newsletter-2026-q1/)

```odin
package main

import "core:fmt"

// Classic use case: threaded interpreter / state machine dispatch
// "preserve/none" = no caller-saved registers, perfect for tail calls
Op :: enum i32 { PUSH, ADD, SUB, MUL, HLT }
Instr :: struct { op: Op, val: i32 }
VM    :: struct { stack: [16]i32, sp: int }

push :: proc "contextless" (vm: ^VM, v: i32) { vm.stack[vm.sp] = v; vm.sp += 1 }
pop  :: proc "preserve/none" (vm: ^VM) -> i32 { vm.sp -= 1; return vm.stack[vm.sp] }

// Main dispatch — each case tail-calls itself → zero stack growth
exec :: proc "preserve/none" (vm: ^VM, code: [^]Instr) -> i32 {
    do_push :: proc "preserve/none" (vm: ^VM, code: [^]Instr) -> i32 {
        push(vm, code[0].val)
        return #must_tail exec(vm, code[1:])   // MUST tail call — compile error if not
    }
    do_add :: proc "preserve/none" (vm: ^VM, code: [^]Instr) -> i32 {
        b, a := pop(vm), pop(vm)
        push(vm, a + b)
        return #must_tail exec(vm, code[1:])
    }
    do_sub :: proc "preserve/none" (vm: ^VM, code: [^]Instr) -> i32 {
        b, a := pop(vm), pop(vm)
        push(vm, a - b)
        return #must_tail exec(vm, code[1:])
    }
    do_hlt :: proc "preserve/none" (vm: ^VM, _: [^]Instr) -> i32 {
        return pop(vm)
    }

    @(static, rodata)
    LUT := [Op](proc "preserve/none" (^VM, [^]Instr) -> i32){
        .PUSH = do_push,
        .ADD  = do_add,
        .SUB  = do_sub,
        .MUL  = do_hlt, // placeholder
        .HLT  = do_hlt,
    }
    return #must_tail LUT[code[0].op](vm, code)
}

main :: proc() {
    vm: VM
    program := []Instr{
        {.PUSH, 10},
        {.PUSH, 20},
        {.ADD,  0},
        {.PUSH, 5},
        {.SUB,  0},
        {.HLT,  0},
    }
    result := exec(&vm, raw_data(program))
    fmt.println("VM result:", result) // 25
}
```

**📝 Exercises:**
1. Extend the VM with `MUL`, `DIV`, `DUP` (duplicate top), and `SWAP` opcodes using `#must_tail`.
2. Build a Fibonacci VM using `#must_tail` recursion — compare stack depth with normal recursion.
3. Write a regex NFA evaluator using `#must_tail` for state transitions — benchmark against a loop-based version.

---

### 15. 📥 User I/O — Correct dev-2026-03+ Pattern

With the new `core:os` (as of dev-2026-03), file/stdin I/O now uses `^os.File`:

```odin
package main

import "core:fmt"
import "core:os"
import "core:strings"
import "core:strconv"
import "core:bufio"

// ── STDOUT / STDERR ───────────────────────────────────────────
print_demo :: proc() {
    fmt.println("Hello, Odin dev-2026-04!")          // println — adds newline
    fmt.printf("Name: %s, Age: %d\n", "Alice", 30)   // printf — C-style format
    fmt.printfln("Pi ≈ %.4f", 3.14159)               // printfln — printf + newline
    fmt.eprintln("This goes to stderr")               // eprintln
    fmt.eprintf("error: %s\n", "something broke")    // eprintf
}

// ── STDIN — reading a line ────────────────────────────────────
read_line :: proc() -> (line: string, ok: bool) {
    // bufio.Reader wraps os.stdin (which is ^os.File in new core:os)
    reader: bufio.Reader
    bufio.reader_init(&reader, os.stdin)
    defer bufio.reader_destroy(&reader)

    l, err := bufio.reader_read_string(&reader, '\n', context.allocator)
    if err != nil { return "", false }
    // Trim trailing \n and \r\n
    return strings.trim_right(l, "\r\n"), true
}

// ── STDIN — reading formatted input ──────────────────────────
read_int :: proc() -> (n: int, ok: bool) {
    line, line_ok := read_line()
    if !line_ok { return 0, false }
    val, parse_ok := strconv.parse_int(strings.trim_space(line), 10)
    return val, parse_ok
}

// ── FILE I/O — new core:os API ────────────────────────────────
read_file_demo :: proc() {
    // Read entire file — MUST pass explicit allocator (new in 2026-03)
    data, err := os.read_entire_file("hello.txt", context.allocator)
    if err != nil {
        fmt.eprintln("read error:", err)
        return
    }
    defer delete(data)
    fmt.println("file contents:", string(data))
}

write_file_demo :: proc() {
    // Write a file
    err := os.write_entire_file("output.txt", transmute([]byte)string("Hello from Odin!\n"))
    if err != nil {
        fmt.eprintln("write error:", err)
    }
}

// ── FULL INTERACTIVE PROGRAM ──────────────────────────────────
main :: proc() {
    print_demo()

    fmt.print("Enter your name: ")
    name, name_ok := read_line()
    if !name_ok {
        fmt.eprintln("failed to read name")
        os.exit(1)
    }
    fmt.printfln("Hello, %s!", name)

    fmt.print("Enter a number: ")
    n, n_ok := read_int()
    if !n_ok {
        fmt.eprintln("invalid number")
        os.exit(1)
    }
    fmt.printfln("%d × %d = %d", n, n, n * n)

    // CLI args
    args := os.args            // []string — program path is args[0]
    fmt.println("argc:", len(args))
    for arg, i in args {
        fmt.printf("  args[%d] = %s\n", i, arg)
    }

    // Environment variable
    if home, ok := os.lookup_env("HOME", context.allocator); ok {
        defer delete(home)
        fmt.println("HOME:", home)
    }

    read_file_demo()
    write_file_demo()
}
```

**📝 Exercises:**
1. Build a complete CLI calculator REPL that reads `num1 op num2` per line, handles `+`, `-`, `*`, `/`, shows error for bad input, and exits on `quit`.
2. Write a line counter: reads a filename from args, opens it with the new `core:os` API, counts lines, and prints `filename: N lines`.
3. Create a `parse_flags` procedure that reads `os.args[1:]` and returns a `map[string]string` of `--key=value` pairs, with usage help on `--help`.

---

## 🗺️ Odin dev-2026-04 Quick Reference

```
DECLARATION SYNTAX:
  x := 42              // var, inferred type
  x: int = 42          // var, explicit type
  X :: 42              // constant
  X :: proc() { ... }  // procedure constant

PROCEDURES:
  foo :: proc(a, b: int) -> int { return a + b }
  foo :: proc(a: int) -> (val: int, ok: bool) { ... }

GENERICS ($T):
  foo :: proc(x: $T) -> T { ... }
  foo :: proc(x: []$T) -> T where intrinsics.type_is_numeric(T) { ... }

TYPES:
  [5]int           // array (fixed)
  []int            // slice
  [dynamic]int     // dynamic array  
  [dynamic; N]int  // fixed-cap dynamic array (NEW 2026-04)
  map[string]int   // hash map
  #soa[]Struct     // SOA layout
  bit_field u32 { field: T | bits }  // bit field

MEMORY:
  new(T)                   // alloc one T, uses context.allocator
  make([]T, len)           // alloc slice
  make([dynamic]T, 0, cap) // alloc dynamic array
  free(ptr)                // free T
  delete(slice/map/dynarray)
  free_all(context.temp_allocator)

CONTEXT (implicit):
  context.allocator        // current allocator
  context.temp_allocator   // temp/scratch allocator
  context.logger           // logger
  context.random_generator // RNG (chacha8rand since 2026-01)

ERROR HANDLING (no exceptions, no Result type):
  val, ok := parse_int("42")           // bool idiom
  data, err := os.read_entire_file(…)  // error value idiom
  or_return                            // early return on error/false
  or_break / or_continue               // break/continue on error

BREAKING CHANGES (2026):
  core:os      → new API, explicit allocator required
  core:os/old  → old API available until Q3 2026
  using stmt   → opt-in via #+feature using-stmt at file top
  rand default → chacha8rand (different output for same seed)
  os.Handle    → ^os.File

FILE FEATURES:
  #+feature using-stmt  — enable using as statement per-file
  #must_tail            — force tail call, compile error if not possible
  #all_or_none          — struct must be fully or zero initialized
  #simple               — struct uses memcmp equality
  -lto:thin             — Link Time Optimization

NEW PACKAGES 2026:
  core:nbio              — non-blocking I/O (io_uring/IOCP/kQueue)
  core:container/xar     — exponential arrays (stable pointers)
  core:container/handle_map — generational index containers
  core:crypto/argon2id   — Argon2id password hashing
  vendor:curl            — libcurl bindings
```