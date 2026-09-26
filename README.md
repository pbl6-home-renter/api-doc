# PBL6 — API Documentation & Specification Hub

Repository này là trung tâm lưu trữ, định nghĩa và đồng bộ đặc tả API (OpenAPI 3.0) của dự án **PBL6 (Hệ thống quản lý nhà trọ và tìm bạn ở ghép)** với nền tảng **Apidog**.

---

## 1. Kiến trúc thư mục

Mã nguồn đặc tả được viết bằng **YAML**, tổ chức dạng module hóa (chia nhỏ theo domain) trong thư mục `src/` để dễ đọc, dễ viết và review code trên Git:

```text
be/
├── src/
│   ├── openapi.yaml                     # Entrypoint OpenAPI 3.0.3 tổng hợp toàn bộ API
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
│   └── rentify.json                     # [AUTO-GENERATED] File OpenAPI gộp duy nhất để Apidog đọc
│
├── package.json                         # Scripts hỗ trợ bundle, lint và preview
└── README.md
```

---

## 2. Quy trình làm việc (Development Workflow)

### Bước 1: Chỉnh sửa mã nguồn trong `src/`
- **Không sửa trực tiếp file `reference/rentify.json`!**
- Khi thêm hoặc sửa Entity/Schema:
  - Viết file `.yaml` trong `src/schemas/<domain>/`.
  - Kế thừa `BaseEntity` bằng cú pháp `allOf`:
    ```yaml
    type: object
    x-apidog-folder: "Tên Domain" # Để Apidog tự gom vào nhóm tương ứng
    title: TênEntity
    allOf:
      - $ref: '../../common/base-entity.yaml'
      - type: object
        properties:
          ...
    ```
  - Khai báo schema mới vào mục `components/schemas` trong `src/openapi.yaml`.

### Bước 2: Kiểm tra cú pháp (Lint)
Chạy lệnh kiểm tra tính hợp lệ của OpenAPI:
```bash
npm run lint:npx
# hoặc nếu đã npm install:
npm run lint
```

### Bước 3: Biên dịch file cho Apidog (Bundle)
Chạy script bundle để gộp toàn bộ các file con trong `src/` thành file `reference/rentify.json`:
```bash
npm run bundle:npx
# hoặc nếu đã npm install:
npm run bundle
```
Lệnh này sẽ tự động:
1. Giải quyết toàn bộ `$ref` tương đối giữa các file.
2. Giữ nguyên tên chuẩn theo `title` (PascalCase: `User`, `Building`, `Invoice`...).
3. Xuất file `reference/rentify.json` để Apidog đồng bộ.

### Bước 4: Commit & Push lên Git
```bash
git add .
git commit -m "feat(schemas): mô tả thay đổi"
git push origin <tên-nhánh>
```

### Bước 5: Xem trên Apidog
- Mở Apidog (dự án `rentify`), chọn đúng nhánh Git bạn vừa push.
- Bấm **Sync / Refresh**: Các API và mục **`Schemas ▾`** sẽ tự động cập nhật ngay lập tức.

---

## 3. Các lệnh thường dùng

| Lệnh | Mục đích |
|---|---|
| `npm run bundle:npx` | Gộp toàn bộ `src/` thành `reference/rentify.json` (không cần cài package) |
| `npm run lint:npx` | Kiểm tra lỗi cú pháp và chuẩn OpenAPI của bộ tài liệu |
| `npm run preview` | Mở giao diện xem trước tài liệu trực tiếp trên trình duyệt local |

---

## 4. Quy ước đồng bộ & Thiết kế
- **Cơ sở dữ liệu:** Mọi entity phải bám sát đặc tả `database-design.md` trong repo `pm`.
- **Định dạng phản hồi:** Tuân thủ quy tắc response wrapper trong `api-conventions.md` (`statusCode`, `code`, `data`).
- **Phân nhánh:** Tuân thủ Light GitFlow: nhánh tính năng có tiền tố `feature/` hoặc `docs/`.
