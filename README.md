# PBL6 — API Documentation & Specification Hub

Repository này là trung tâm lưu trữ, định nghĩa và đồng bộ đặc tả API (OpenAPI 3.0) của dự án **PBL6 (Hệ thống quản lý nhà trọ và tìm bạn ở ghép)** với nền tảng **Apidog**.

---

## 1. Kiến trúc thư mục

Mã nguồn đặc tả được viết bằng **YAML**, tổ chức dạng module hóa theo domain trong thư mục `src/` để dễ đọc, dễ viết và review code trên Git:

```text
be/
├── src/
│   ├── openapi.yaml                     # Entrypoint OpenAPI 3.0.3 tổng hợp toàn bộ components & paths
│   │
│   ├── common/                          # Kiểu dữ liệu và định nghĩa dùng chung
│   │   └── base-entity.yaml             # BaseEntity (id, createdAt, updatedAt, isDeleted)
│   │
│   ├── schemas/                         # 25 Domain Entities (từ database-design.md)
│   │   ├── user/                        # user, landlord-profile, roommate-profile
│   │   ├── property/                    # building, room, favorite-room
│   │   ├── contract/                    # contract, contract-member
│   │   ├── billing/                     # rate-policy, billing-setting, meter-reading, invoice, payment
│   │   ├── operation/                   # issue-report, media, audit-log
│   │   ├── chat/                        # conversation, conversation-member, message, message-mention
│   │   ├── matching/                    # match-request
│   │   └── notification/                # notification, notification-preference, push-device
│   │
│   ├── responses/                       # Wrappers phản hồi chuẩn (api-conventions.md)
│   │   ├── wrappers/                    # success-single, success-list, error-default, error-validation
│   │   └── dtos/                        # Response DTOs
│   │
│   ├── requests/                        # Request Body DTOs theo từng nghiệp vụ
│   ├── parameters/                      # Path, Query, Header parameters tái sử dụng
│   └── paths/                           # Chi tiết từng endpoint URL theo domain
│
├── reference/
│   └── rentify.json                     # [AUTO-GENERATED] File OpenAPI đã bundle để Apidog đồng bộ
│
├── package.json                         # Chứa các script npx tiện ích (bundle, lint, preview)
└── README.md
```

---

## 2. Hướng dẫn làm việc giữa Repo và Apidog (Step-by-step)

Quy trình chuẩn khi làm việc với API hàng ngày giữa VS Code / IDE và Apidog gồm các bước sau:

```text
[Tạo nhánh Git] ➔ [Thiết kế API/DTO trong src/] ➔ [npm run bundle] ➔ [Push nhánh] ➔ [Vào Apidog Pull nhánh] ➔ [Kiểm tra Specs & APIs]
```

### Bước 1: Mở repo & Tạo nhánh làm việc mới
Mở terminal tại thư mục `be`, tạo một nhánh riêng để làm việc:
```bash
git checkout -b feature/<tên-chức-năng>
# Ví dụ: git checkout -b feature/auth-endpoints
```

---

### Bước 2: Thiết kế API, DTOs & Schemas trong `src/`
Toàn bộ mã nguồn bạn viết đều nằm trong thư mục `src/`:

1. **Nếu thêm/sửa Schema (Entity / DTO):**
   - Viết file YAML trong `src/schemas/<domain>/` (hoặc `src/requests/`, `src/responses/`).
   - Nhớ gắn thẻ `x-apidog-folder` để Apidog tự gom vào folder:
     ```yaml
     type: object
     x-apidog-folder: "User"   # Tên folder hiển thị trên Apidog
     title: User
     allOf:
       - $ref: '../../common/base-entity.yaml'
       - type: object
         properties:
           phone:
             type: string
     ```
2. **Nếu thêm Endpoint (API Path):**
   - Viết file YAML trong `src/paths/<domain>/` (ví dụ `login.yaml`).
3. **Khai báo liên kết vào `src/openapi.yaml`:**
   - Thêm đường dẫn `$ref` của Schema hoặc Path mới vào `src/openapi.yaml`.

---

### Bước 3: Biên dịch file cho Apidog (Bundle)
Chạy lệnh bundle để tự động giải quyết các `$ref` và cập nhật file `reference/rentify.json`:
```bash
npm run bundle
```
> *Lệnh này chạy qua `npx` của Node.js, bạn không cần phải chạy `npm install` trước.*

---

### Bước 4: Commit & Push nhánh lên GitHub
```bash
git add .
git commit -m "feat: thêm api đăng nhập và schema người dùng"
git push origin feature/<tên-chức-năng>
```

---

### Bước 5: Lên Apidog đồng bộ nhánh mới về
1. Mở ứng dụng **Apidog**, vào dự án **`rentify`**.
2. Nhìn lên góc trên bên trái (chỗ dropdown chọn nhánh Git bên cạnh chữ APIs):
   - Bấm vào tên nhánh -> Chọn **Fetch from remote** (hoặc vào **Settings -> Git Branches** để kéo danh sách nhánh mới về).
   - Chọn chuyển sang nhánh `feature/<tên-chức-năng>` bạn vừa push.
3. Bấm nút **Sync / Refresh (🔄)** để Apidog nạp dữ liệu từ commit mới.

---

### Bước 6: Kiểm tra trên Apidog
1. **Kiểm tra ở tab `Specs` (icon `{}`):**
   - Mở file `src/openapi.yaml` hoặc `reference/rentify.json` để kiểm tra preview cú pháp và outline tổng quan.
2. **Kiểm tra ở tab `APIs` (icon cắm điện):**
   - **Mục `Endpoints ▾`:** Kiểm tra các API URL đã xuất hiện đúng nhóm, đầy đủ Request Body, Query Params và Response chưa.
   - **Mục `Schemas ▾`:** Kiểm tra các Schema đã nằm gọn trong từng folder (`User`, `Property`, `Billing`...), click vào từng Schema xem các trường dữ liệu và quan hệ kế thừa `allOf` có hiển thị đầy đủ không.

---

## 3. Bảng lệnh nhanh

| Lệnh | Mô tả |
|---|---|
| `npm run bundle` | Gộp toàn bộ `src/` thành `reference/rentify.json` để Apidog đồng bộ |
| `npm run lint` | Kiểm tra cú pháp và quy chuẩn OpenAPI trước khi commit |
| `npm run preview` | Khởi chạy giao diện xem trước tài liệu trực tiếp trên trình duyệt |
