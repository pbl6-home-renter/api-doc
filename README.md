# PBL6 — API Documentation & Specification Hub

Repository này là trung tâm lưu trữ, định nghĩa và đồng bộ đặc tả API (OpenAPI 3.0) của dự án **PBL6 (Hệ thống quản lý nhà trọ và tìm bạn ở ghép)** với nền tảng **Apidog**.

Các API Auth/User phản ánh hành vi Identity-Service hiện tại. Khi gọi trực tiếp service, dùng prefix `/identity-service/api/v1` (server override trong từng operation); các domain khác giữ server chung. Login/register trả token trong JSON và không đặt cookie. Refresh/logout (P4-04) đã có trong `openapi.yaml` theo thiết kế, nhận refresh token trong body JSON, nhưng service chưa triển khai. Mã lỗi validation giữ nguyên giá trị do service trả, kể cả thông báo tiếng Anh của query validator. Sau khi sửa tài liệu, chạy `npm run bundle` và đồng bộ nhánh trong Apidog để nạp thay đổi.

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
>
> *Sau khi bundle, lệnh tự chèn lịch sử thay đổi contract (từ `reports/api-changelog.json`) vào description của từng endpoint. YAML trong `src/` không bị sửa.*

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
| `npm run contract:report -- --base-ref <sha> --head-ref <sha>` | Báo cáo thay đổi contract giữa hai commit (cần oasdiff) |
| `npm run contract:demo` | Chạy 4 fixture mẫu, ghi `reports/demo/` (cần oasdiff) |

---

## 4. Contract change log (tự động)

Mỗi thay đổi API contract được tự động phát hiện, phân loại và ghi lại. **Dev chỉ cần điền mục `## Lý do thay đổi API` trong mô tả PR**; mọi bước còn lại do GitHub Actions làm.

| Thời điểm | Workflow | Kết quả |
|---|---|---|
| Mở/cập nhật PR vào `main` có sửa `src/` | `contract-check.yml` | Bot comment báo cáo lên PR. Nếu `BREAKING`/`NEEDS_REVIEW`: gắn label `api-breaking` và request reviewer. **Không chặn merge.** |
| Merge vào `main` | `contract-log.yml` | Bot ghi entry vào `reports/api-changelog.{json,md}`, bundle lại `reference/rentify.json` kèm lịch sử theo endpoint và commit (`[skip ci]`). |

Phân loại: **BREAKING** = client cũ có thể hỏng · **NEEDS_REVIEW** = cần người xác nhận (mọi thay đổi security luôn ở mức này trở lên) · **NON_BREAKING** = tương thích. Sửa description/example/summary/title được coi là không đổi contract.

**FE/Mobile xem ở đâu:**
- Trên Apidog: cuối description của mỗi endpoint có bảng **Lịch sử thay đổi contract** (5 lần gần nhất).
- Lịch sử đầy đủ: [`reports/api-changelog.md`](reports/api-changelog.md).

**Lưu ý:**
- Không sửa tay `reports/api-changelog.*`; file này chỉ do bot ghi.
- Reviewer được request tự động lấy từ repository variable `CONTRACT_REVIEWERS` (danh sách username GitHub, cách nhau bởi dấu phẩy). Không đặt thì chỉ gắn label.
- Nếu bật branch protection cho `main`, cần thêm **GitHub Actions** vào bypass list của ruleset, nếu không bot sẽ không push được.
- Chạy local cần [oasdiff 1.34.1](https://github.com/oasdiff/oasdiff/releases/tag/v1.34.1) trong `PATH` hoặc đặt biến `OASDIFF_BIN`.
