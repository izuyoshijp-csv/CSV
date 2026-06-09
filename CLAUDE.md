# CLAUDE.md

## Tổng quan dự án

Đây là template **Next.js 16 (App Router) dashboard** với TypeScript, shadcn/ui, Tailwind CSS v4, Firebase (Firestore + Auth + Storage), và Zustand. Cấu trúc theo pattern multi-feature: mỗi feature có service layer, components, và mock data riêng.

## Tech Stack

<!-- markdownlint-disable MD060 -->

| Category      | Choice                                                       |
| ------------- | ------------------------------------------------------------ |
| Framework     | Next.js 16.1.1 (App Router)                                  |
| Language      | TypeScript 5.9.3                                             |
| Styling       | Tailwind CSS v4 + CSS variables                              |
| UI Library    | shadcn/ui (style: `new-york`)                                |
| Icons         | lucide-react                                                 |
| Tables        | @tanstack/react-table 8.21.3                                 |
| Forms         | react-hook-form + @hookform/resolvers + zod 4.3.2            |
| State         | Zustand 5.0.9                                                |
| Auth/Database | NextAuth.js v5 + Firebase Auth & Firebase Admin + Firestore  |
| Storage       | Firebase Storage                                             |
| Charts        | Recharts 3.6.0                                               |
| Theme         | next-themes + custom ThemeProvider + SidebarConfigProvider   |
| Toast         | sonner 2.0.7                                                 |
| Date          | date-fns 4.1.0 + react-day-picker 9.13.0                     |

<!-- markdownlint-enable MD060 -->

## Cấu trúc thư mục

```text
src/
  app/                          # Next.js App Router
    (auth)/                     # Route group: không sidebar
      sign-in/, sign-up/, forgot-password/
      errors/                   # forbidden, internal-server-error, not-found, unauthorized, under-maintenance
    api/auth/[...nextauth]/     # NextAuth API route handlers (GET/POST)
    (dashboard)/                # Route group: có sidebar
      dashboard/, dashboard-2/, dashboard-3/
      tasks/, users/, chat/, mail/, calendar/
      faqs/, pricing/
      mock-data/                # Firestore seed UI
      settings/                 # user, account, billing, appearance, notifications, connections
    landing/                    # Public landing page
    layout.tsx                  # Root layout (ThemeProvider, SidebarConfigProvider, AuthProvider)
  components/
    ui/                         # 40 shadcn/ui components
    app-sidebar.tsx, site-header.tsx, site-footer.tsx
    theme-provider.tsx, mode-toggle.tsx
    auth-provider.tsx           # NextAuth SessionProvider wrapper
    firebase-session-sync.tsx   # Client session synchronization for Firebase SDK
    theme-customizer/           # Panel tùy chỉnh theme/layout
  modules/                      # Feature modules — xem mục "Module Pattern" bên dưới
    tasks/, users/, chat/, mail/, calendar/
    dashboard/, dashboard-2/, dashboard-3/
    faqs/, pricing/, settings/, mock-data-services.ts
  lib/
    firebase/
      client.ts                 # Firebase client (app, auth, db, storage)
      admin.ts                  # Firebase Admin SDK (server-only)
      auth.ts                   # signIn/signUp helpers
      firestore-query.ts        # getFirestoreCollection (có mock fallback)
      mock-data-seeder.ts       # Server-side seeder (Admin SDK + batch write)
    utils.ts                    # cn() helper
    fonts.ts                    # Inter font config
  contexts/
    theme-context.ts            # ThemeProviderContext (dark/light/system)
    sidebar-context.tsx         # SidebarConfigProvider + useSidebarConfig
  hooks/                        # use-theme, use-sidebar-config, ...
  types/
    next-auth.d.ts              # NextAuth types & module augmentation
  auth.config.ts                # NextAuth edge-compatible base configuration
  auth.ts                       # NextAuth node-compatible main initialization
  proxy.ts                      # Next.js 16 route protection proxy
```

<!-- markdownlint-disable MD040 -->

## Module Pattern

Mỗi feature theo cùng cấu trúc. **`tasks`** là canonical reference (đầy đủ nhất):

```
src/app/(dashboard)/<feature>/page.tsx
src/modules/<feature>/
  services/
    types/<feature>-types.ts      # zod schema + TypeScript interfaces
    <feature>-mock-data.ts        # Static mock data (import JSON)
    <feature>-services.ts        # Firestore query helpers
    mock-data-services.ts        # Seeder cho feature này
    data/<feature>.json           # JSON data file
  components/
    data-table.tsx                 # Tanstack Table wrapper
    columns.tsx                    # Column definitions
    data-table-toolbar.tsx         # Search, filter selects, add button
    data-table-faceted-filter.tsx # Command-palette filter
    data-table-pagination.tsx     # Pagination
    data-table-view-options.tsx   # Column visibility toggle
    data-table-row-actions.tsx    # Dropdown: view/edit/delete
    add-<feature>-modal.tsx       # Create dialog
    stat-cards.tsx                 # Optional stat cards
```

<!-- markdownlint-enable MD040 -->

Các modules hiện có: **tasks** (đầy đủ nhất), **users** (react-hook-form + zod), **chat** (Zustand store), **mail** (3-panel layout), **calendar** (date normalization), **dashboard/dashboard-2/dashboard-3**, **faqs**, **pricing**, **settings**.

## Quy ước quan trọng

### Firebase Firestore

- **Collection naming**: số nhiều, snake_case (`tasks`, `users`, `conversations`, `messages`)
- **Mock data fallback**: luôn truyền mock data làm fallback — service dùng `getFirestoreCollection`
- **No real-time**: KHÔNG dùng `onSnapshot`
- **CRUD pattern**: KHÔNG viết direct Firestore CRUD ở service — xử lý trên local state (callback pattern)
- **Timestamps**: dùng `serverTimestamp()` khi seed bằng Admin SDK
- **Client vs Admin**: components/pages chỉ dùng `client.ts`; seeder dùng `admin.ts` với `server-only`

### Page types

- **Server pages** (async): gọi service trực tiếp, `await` data, truyền vào components. Ví dụ: `dashboard`, `calendar`, `mail`, `faqs`, `pricing`
- **Client pages** (`"use client"`): khởi tạo state với mock data, fetch Firestore trong `useEffect`, quản lý state cục bộ. Ví dụ: `tasks`, `users`, `chat`

### Form validation

Dùng `react-hook-form` + `@hookform/resolvers/zod`. Định nghĩa schema với zod, dùng `zodResolver` trong `useForm`.

### cn() utility

Luôn dùng `cn()` từ `@/lib/utils` để merge Tailwind classes — KHÔNG dùng template literals cho conditional classes.

### Path alias

`@/*` map tới `./src/*` (cấu hình trong `tsconfig.json`).

## Firebase Integration

### getFirestoreCollection (src/lib/firebase/firestore-query.ts)

```typescript
// Thử Firestore trước, fallback sang mock data nếu empty hoặc lỗi
const data = await getFirestoreCollection<TaskItem>("tasks", TaskMockData)
```

### Mock Data Seeder (src/lib/firebase/mock-data-seeder.ts)

- Server-side dùng Admin SDK + batch writes với `merge: true`
- Idempotent: re-seeding ghi đè document cùng ID
- Thêm `seededAt: FieldValue.serverTimestamp()` vào mỗi document
- UI seeder ở `/mock-data` cho phép seed từng feature hoặc tất cả

### Auth (src/lib/firebase/auth.ts & src/auth.ts)

- Firebase Client Auth xử lý các luồng đăng nhập/đăng ký tại frontend.
- NextAuth `CredentialsProvider` đóng vai trò là ranh giới quản lý phiên (session boundary), xác thực Firebase ID Token phía máy chủ thông qua Firebase Admin SDK và tạo Custom Token để đồng bộ ngược lại với Firebase Client SDK.
- `src/proxy.ts` thực hiện bảo vệ định tuyến (route protection) trong Next.js 16 bằng cách kiểm tra Session cookie của NextAuth.

## Environment Variables

**Client Firebase** (Next.js client-side, ký tự `NEXT_PUBLIC_`):
`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

**Server (Firebase Admin & NextAuth)** (server-only, không `NEXT_PUBLIC_`):
`FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, `AUTH_SECRET`

Xem `.env.example` để biết đầy đủ template.

## Thêm feature mới

Khi thêm feature mới, tham khảo skill **`nextjs-firebase-feature`** tại `.claude/skills/nextjs-firebase-feature/SKILL.md`. Các bước chính:

1. Tạo types với zod schema
2. Tạo mock data (array of items)
3. Tạo service dùng `getFirestoreCollection`
4. Tạo columns, row actions, toolbar, pagination, view options
5. Tạo data table (Tanstack Table)
6. Tạo add modal
7. Tạo stat cards (optional)
8. Tạo page ghép mọi thứ lại
9. Chạy `npx tsc --noEmit` kiểm tra TypeScript
10. Chạy `npm run dev` xác nhận hoạt động

## Conventions

- Functional components + hooks — không dùng React class components
- Server components ưu tiên, chỉ dùng `"use client"` khi cần interaction hoặc state
- Các thư viện UI được dynamic import trong `src/components/dynamic-imports.ts`
- Recharts dùng cho charts, tanstack/react-table cho tables
- Toast notifications dùng `sonner`
- Date handling với `date-fns`

## Lưu ý khi làm việc

- Không reveal internal Firestore config hoặc private keys
- Firebase error messages tiếng Việt trong `auth.ts`
- Mock data seeder là server action, dùng `admin.ts` không phải `client.ts`
- Nếu thêm feature mới: đọc SKILL.md trước khi code
