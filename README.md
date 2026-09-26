# PBL6 — API Documentation & Specification Hub

Repository này là trung tâm lưu trữ, định nghĩa và đồng bộ đặc tả API (OpenAPI 3.0) của dự án **PBL6 (Hệ thống quản lý nhà trọ và tìm bạn ở ghép)** với nền tảng **Apidog**.

---

## 1. Kiến trúc thư mục

Mã nguồn đặc tả được viết bằng **YAML**, tổ chức dạng module hóa theo domain trong thư mục `src/` để dễ đọc, dễ viết và review code trên Git:

```text
be/
├── src/
│   ├── openapi.yaml                     # Entrypoint OpenAPI 3.0.3 tổng hợp toàn bộ components
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

## 2. Quy trình làm việc (Development Workflow)

### Bước 1: Thêm hoặc chỉnh sửa Schema trong `src/schemas/`
- **Không sửa trực tiếp file `reference/rentify.json`!**
- Khi thêm hoặc sửa Entity/Schema:
  - Tạo hoặc sửa file `.yaml` trong thư mục domain tương ứng (`src/schemas/<domain>/`).
  - Gắn thuộc tính `x-apidog-folder` để Apidog tự động xếp vào folder tương ứng:
    ```yaml
    type: object
    x-apidog-folder: "Tên Domain" # User, Property, Contract, Billing, Chat, Operation, Matching, Notification
    title: TênEntity
    description: Mô tả entity
    allOf:
      - $ref: '../../common/base-entity.yaml'
      - type: object
        properties:
          ...
    ```
  - Khai báo file mới vào mục `components/schemas` trong `src/openapi.yaml`.

### Bước 2: Biên dịch file cho Apidog (Bundle)
Chạy script bundle để gộp toàn bộ các file con trong `src/` thành file `reference/rentify.json`:
```bash
npm run bundle
# hoặc chạy trực tiếp bằng npx:
npx @redocly/cli bundle src/openapi.yaml -o reference/rentify.json --ext json --component-names-strategy title
```
Lệnh này sẽ tự động:
1. Giải quyết toàn bộ `$ref` tương đối giữa các file con.
2. Giữ nguyên tên chuẩn theo `title` (PascalCase: `User`, `Building`, `Invoice`...).
3. Cập nhật file `reference/rentify.json` để Apidog đọc.

### Bước 3: Commit & Push lên Git
```bash
git add .
git commit -m "feat(schemas): mô tả ngắn gọn thay đổi"
git push origin <tên-nhánh>
```

### Bước 4: Xem trên Apidog
- Mở Apidog (dự án `rentify`), chọn đúng nhánh Git vừa push.
- Bấm **Sync / Refresh**: Các API và danh mục **`Schemas ▾`** sẽ tự động hiển thị đầy đủ thuộc tính và folder.

---

## 3. Các lệnh npx tiện ích

Mọi lệnh đều chạy trực tiếp qua `npx` của Node.js, **không cần chạy `npm install`**:

| Lệnh | Mục đích |
|---|---|
| `npm run bundle` | Gộp toàn bộ `src/` thành `reference/rentify.json` để Apidog đọc |
| `npm run lint` | Kiểm tra lỗi cú pháp và chuẩn OpenAPI của bộ tài liệu |
| `npm run preview` | Mở giao diện xem trước tài liệu trực tiếp trên trình duyệt local |
