# Development Gameplan: Build It Yourself

This guide is for learning by doing. No AI assistance—just you, the docs, and your brain.

---

## Phase 1: Understand the Stack

Before writing code, understand what you're working with.

### Read These Docs

| Topic | Resource |
|-------|----------|
| SvelteKit basics | https://kit.svelte.dev/docs/introduction |
| Svelte 5 runes | https://svelte.dev/docs/svelte/what-are-runes |
| PocketBase JS SDK | https://github.com/pocketbase/js-sdk |
| PocketBase collections | https://pocketbase.io/docs/collections |
| Zod validation | https://zod.dev |
| TypeScript handbook | https://www.typescriptlang.org/docs/handbook |

### Exercises

1. Open `src/routes/+page.svelte` and trace how the form works
2. Open `src/lib/schemas.ts` and understand the Zod schema
3. Log into PocketBase admin and explore the default `users` collection

---

## Phase 2: Design Your Collections

Collections are your database tables. Plan them on paper first.

### How to Create a Collection in PocketBase

1. Go to http://localhost:8090/_/
2. Click "New collection"
3. Choose type: **Base** (regular data) or **Auth** (users with login)
4. Add fields one by one
5. Set API rules (who can read/write)

### Field Types You'll Use

| Type | Use Case |
|------|----------|
| Text | Names, titles, short strings |
| Editor | Rich text, descriptions |
| Number | Quantities, scores, ages |
| Bool | Toggles, flags |
| Email | Email addresses |
| URL | Links |
| Date | Dates and times |
| Select | Dropdown options |
| Relation | Link to another collection |
| File | Uploads |
| JSON | Flexible structured data |

### Example: Golf Course Collection

Think about what data you need:

```
Collection: courses
Fields:
  - name (text, required)
  - location (text)
  - par (number)
  - holes (number, default: 18)
  - created (auto)
  - updated (auto)
```

### Your Task

1. List all the entities your app needs (courses, players, rounds, scores, etc.)
2. For each entity, list the fields and their types
3. Identify relationships (a round belongs to a course, a score belongs to a round)
4. Create them in PocketBase admin

---

## Phase 3: Export Your Schema

After creating collections, export them so they're version controlled.

```bash
cd backend
./pocketbase migrate collections
```

This creates files in `pb_migrations/` that you can commit.

---

## Phase 4: Connect Frontend to Backend

### Step 1: Install the SDK

```bash
npm install pocketbase
```

### Step 2: Create a PocketBase Client

Create `src/lib/pocketbase.ts`:

```typescript
import PocketBase from 'pocketbase';

export const pb = new PocketBase('http://localhost:8090');
```

### Step 3: Fetch Data

In a Svelte component or `+page.ts` load function:

```typescript
import { pb } from '$lib/pocketbase';

// Get all records
const records = await pb.collection('courses').getFullList();

// Get one record
const record = await pb.collection('courses').getOne('RECORD_ID');

// Create a record
const created = await pb.collection('courses').create({
  name: 'Pine Valley',
  par: 72
});

// Update a record
const updated = await pb.collection('courses').update('RECORD_ID', {
  par: 71
});

// Delete a record
await pb.collection('courses').delete('RECORD_ID');
```

---

## Phase 5: Build TypeScript Classes

Classes give you methods and logic around your data.

### Pattern: Data Class with Static Factory Methods

Create `src/lib/models/Course.ts`:

```typescript
import { pb } from '$lib/pocketbase';

export class Course {
  id: string;
  name: string;
  location: string;
  par: number;
  holes: number;

  constructor(data: {
    id: string;
    name: string;
    location: string;
    par: number;
    holes: number;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.location = data.location;
    this.par = data.par;
    this.holes = data.holes;
  }

  // Static factory methods
  static async getAll(): Promise<Course[]> {
    // You implement this
  }

  static async getById(id: string): Promise<Course> {
    // You implement this
  }

  static async create(data: Omit<Course, 'id'>): Promise<Course> {
    // You implement this
  }

  // Instance methods
  async save(): Promise<void> {
    // You implement this
  }

  async delete(): Promise<void> {
    // You implement this
  }

  // Business logic methods
  getParPerHole(): number {
    // You implement this
  }

  isRegulation(): boolean {
    // Returns true if 18 holes
    // You implement this
  }
}
```

### Your Task

For each collection you created:

1. Create a class file in `src/lib/models/`
2. Define properties matching your collection fields
3. Write the constructor
4. Implement static methods: `getAll()`, `getById()`, `create()`
5. Implement instance methods: `save()`, `delete()`
6. Add any business logic methods specific to that entity

---

## Phase 6: Add Zod Validation

Validate data before sending to PocketBase.

Create `src/lib/schemas/course.ts`:

```typescript
import { z } from 'zod';

export const courseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().optional(),
  par: z.number().min(27).max(80),
  holes: z.number().min(9).max(36)
});

export type CourseInput = z.infer<typeof courseSchema>;
```

Use it in your class:

```typescript
import { courseSchema } from '$lib/schemas/course';

static async create(data: CourseInput): Promise<Course> {
  const validated = courseSchema.parse(data); // Throws if invalid
  const record = await pb.collection('courses').create(validated);
  return new Course(record);
}
```

---

## Phase 7: Build the UI

### Suggested Order

1. **List page** - Display all records from a collection
2. **Detail page** - Show one record
3. **Create form** - Add new records
4. **Edit form** - Modify existing records
5. **Delete button** - Remove records

### SvelteKit Route Structure

```
src/routes/
  courses/
    +page.svelte        # List all courses
    +page.ts            # Load courses data
    [id]/
      +page.svelte      # Single course detail
      +page.ts          # Load one course
      edit/
        +page.svelte    # Edit form
    new/
      +page.svelte      # Create form
```

---

## Phase 8: Add Authentication

### In PocketBase Admin

The `users` collection exists by default. You can add custom fields to it.

### In Your Frontend

```typescript
// Register
await pb.collection('users').create({
  email: 'user@example.com',
  password: 'securepassword',
  passwordConfirm: 'securepassword'
});

// Login
await pb.collection('users').authWithPassword('user@example.com', 'securepassword');

// Check if logged in
pb.authStore.isValid

// Get current user
pb.authStore.model

// Logout
pb.authStore.clear();
```

---

## Checklist

Use this to track your progress:

### Collections
- [ ] List all entities on paper
- [ ] Create each collection in PocketBase
- [ ] Set up relations between collections
- [ ] Configure API rules
- [ ] Export migrations

### Classes
- [ ] Create `src/lib/models/` directory
- [ ] Write a class for each collection
- [ ] Implement CRUD methods
- [ ] Add business logic methods
- [ ] Write Zod schemas for validation

### UI
- [ ] List page for main entity
- [ ] Detail page
- [ ] Create form
- [ ] Edit form
- [ ] Delete functionality
- [ ] Navigation between pages

### Auth
- [ ] Login page
- [ ] Register page
- [ ] Protected routes
- [ ] Logout button

---

## Tips for Learning

1. **Read error messages carefully** - They tell you exactly what's wrong
2. **Use console.log liberally** - Print values to understand data flow
3. **Check the Network tab** - See what API calls are being made
4. **Start small** - Get one thing working before adding complexity
5. **Commit often** - Save your progress with git
6. **Take breaks** - Fresh eyes solve problems faster

---

## When You Get Stuck

1. Re-read the relevant documentation
2. Check the browser console for errors
3. Check the terminal for server errors
4. Simplify - remove code until it works, then add back
5. Search the error message (without AI)
6. Take a break and come back

Good luck. You've got this.
