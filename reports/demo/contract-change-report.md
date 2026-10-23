# Báo cáo thay đổi API contract

> Báo cáo tự sinh từ nguồn YAML đã bundle. Không phản ánh việc backend đã triển khai.
> Entry fixture/file chỉ ghi commit làm bối cảnh chạy, không phải commit đã thay đổi API thật.

Báo cáo lưu lịch sử các entry đã phát hiện, mới nhất ở trên. `NO_CHANGE` không xóa entry cũ; exit code chỉ phản ánh lần chạy hiện tại.

Công cụ: Redocly 2.64.1; oasdiff 1.34.1. Số entry: **3**.

Phân loại: **BREAKING** = client cũ có thể hỏng; **NON_BREAKING** = tương thích theo contract; **NEEDS_REVIEW** = chưa đủ bằng chứng.

Các vị trí dùng JSON Pointer trên bundle tạm (`~1` là `/`). JSON đi kèm giữ toàn bộ semantic diff, fingerprint và hash phục vụ truy vết.

## Fixture security: POST /rooms yêu cầu bearer token — BREAKING

- ID: `8686fee93227d463bae542200a9bed6f8e0673efbbccc8c3cc36767dd977f69d`
- Contract: rentify-public; repository: https://github.com/pbl6-home-renter/be
- Nguồn: `scripts\fixtures\contract-change\base\openapi.yaml` → `scripts\fixtures\contract-change\security\openapi.yaml`
- Phát hiện (UTC): 2026-10-23T16:36:13.385Z; commit time: 2026-10-23T23:28:14+07:00
- Commit nền: không áp dụng (fixture/file)
- Commit đích/bối cảnh: [2573d866ee44ddfd155c70d93726fdbd2d635bd3](https://github.com/pbl6-home-renter/be/commit/2573d866ee44ddfd155c70d93726fdbd2d635bd3)
- PR: chưa cung cấp; chạy local không suy đoán PR
- Loại metadata: Fixture minh họa; SHA là bối cảnh chạy, không phải thay đổi API thật
- Lý do: Minh họa kiểm chứng phân loại contract theo yêu cầu nghiên cứu; không áp dụng vào API hiện tại.

| Mức ảnh hưởng | Endpoint / vùng | Thay đổi | Hành động FE / Mobile |
|---|---|---|---|
| BREAKING | POST /rooms | Endpoint không còn cho gọi ẩn danh; bắt buộc `bearerAuth`. (`api-security-anonymous-access-removed`) | FE và Mobile: kiểm tra token, header, scope và luồng đăng nhập; BE xác nhận quyền truy cập thực tế, thời điểm áp dụng và tương thích app cũ. |
| NEEDS_REVIEW | components | Thêm security scheme `bearerAuth`. (`api-security-component-added`) | FE và Mobile: kiểm tra token, header, scope và luồng đăng nhập; BE xác nhận quyền truy cập thực tế, thời điểm áp dụng và tương thích app cũ. |
| NON_BREAKING | info | Đã phát hiện breaking change nhưng info.version vẫn là `1.0.0`. (`api-version-not-bumped`) | BE: xem lại quy ước version trước khi chấp nhận breaking change. FE/Mobile: theo kế hoạch chuyển đổi của entry này; version trong OpenAPI chưa chứng minh backend đã triển khai. |

### Vị trí và giá trị trước/sau

| Path / schema / field (JSON Pointer) | Trước | Sau |
|---|---|---|
| `/components/securitySchemes` | null | {"bearerAuth":{"type":"http","scheme":"bearer","bearerFormat":"JWT"}} |
| `/paths/~1rooms/post/security` | null | [{"bearerAuth":[]}] |

**Kiểm tra thủ công:** BE xác nhận lý do, endpoint dùng schema chung, thay đổi role/ownership mô tả bằng văn bản và thời điểm triển khai. FE/Mobile xác nhận tác động với parser và phiên bản client đang hỗ trợ.

## Fixture non-breaking: thêm displayName tùy chọn — NON_BREAKING

- ID: `6da10690a8693b0eaaadda55348ddf9713b8ffe3e68444ab0abd86c68cd70a0e`
- Contract: rentify-public; repository: https://github.com/pbl6-home-renter/be
- Nguồn: `scripts\fixtures\contract-change\base\openapi.yaml` → `scripts\fixtures\contract-change\non-breaking\openapi.yaml`
- Phát hiện (UTC): 2026-10-23T16:36:13.385Z; commit time: 2026-10-23T23:28:14+07:00
- Commit nền: không áp dụng (fixture/file)
- Commit đích/bối cảnh: [2573d866ee44ddfd155c70d93726fdbd2d635bd3](https://github.com/pbl6-home-renter/be/commit/2573d866ee44ddfd155c70d93726fdbd2d635bd3)
- PR: chưa cung cấp; chạy local không suy đoán PR
- Loại metadata: Fixture minh họa; SHA là bối cảnh chạy, không phải thay đổi API thật
- Lý do: Minh họa kiểm chứng phân loại contract theo yêu cầu nghiên cứu; không áp dụng vào API hiện tại.

| Mức ảnh hưởng | Endpoint / vùng | Thay đổi | Hành động FE / Mobile |
|---|---|---|---|
| NON_BREAKING | POST /rooms | Thêm field response tùy chọn `displayName` ở HTTP 201. (`response-optional-property-added`) | FE: có thể bỏ qua field mới displayName; chỉ thêm UI khi cần. Mobile: giữ decoder chấp nhận field lạ; khi thêm DTO, field optional phải có giá trị mặc định/null. Không bắt buộc nâng cấp đồng loạt; kiểm thử parser hiện tại. |

### Vị trí và giá trị trước/sau

| Path / schema / field (JSON Pointer) | Trước | Sau |
|---|---|---|
| `/components/schemas/Room/properties/displayName` | null | {"type":"string","description":"Tên hiển thị tùy chọn, client cũ có thể bỏ qua."} |

**Kiểm tra thủ công:** BE xác nhận lý do, endpoint dùng schema chung, thay đổi role/ownership mô tả bằng văn bản và thời điểm triển khai. FE/Mobile xác nhận tác động với parser và phiên bản client đang hỗ trợ.

## Fixture breaking: buildingId trở thành bắt buộc — BREAKING

- ID: `65613c5f46821c6e0be0f59cbaa2a81beb67047935751c1cb204b3d31d4b40fd`
- Contract: rentify-public; repository: https://github.com/pbl6-home-renter/be
- Nguồn: `scripts\fixtures\contract-change\base\openapi.yaml` → `scripts\fixtures\contract-change\breaking\openapi.yaml`
- Phát hiện (UTC): 2026-10-23T16:36:13.385Z; commit time: 2026-10-23T23:28:14+07:00
- Commit nền: không áp dụng (fixture/file)
- Commit đích/bối cảnh: [2573d866ee44ddfd155c70d93726fdbd2d635bd3](https://github.com/pbl6-home-renter/be/commit/2573d866ee44ddfd155c70d93726fdbd2d635bd3)
- PR: chưa cung cấp; chạy local không suy đoán PR
- Loại metadata: Fixture minh họa; SHA là bối cảnh chạy, không phải thay đổi API thật
- Lý do: Minh họa kiểm chứng phân loại contract theo yêu cầu nghiên cứu; không áp dụng vào API hiện tại.

| Mức ảnh hưởng | Endpoint / vùng | Thay đổi | Hành động FE / Mobile |
|---|---|---|---|
| BREAKING | POST /rooms | Field request `buildingId` chuyển từ tùy chọn sang bắt buộc. (`request-property-became-required`) | FE: thêm buildingId vào payload, form và validation. Mobile: cập nhật DTO/payload, kiểm thử cả phiên bản app đang phát hành. BE phải có phương án tương thích hoặc version mới trước khi bật yêu cầu này. |
| NON_BREAKING | info | Đã phát hiện breaking change nhưng info.version vẫn là `1.0.0`. (`api-version-not-bumped`) | BE: xem lại quy ước version trước khi chấp nhận breaking change. FE/Mobile: theo kế hoạch chuyển đổi của entry này; version trong OpenAPI chưa chứng minh backend đã triển khai. |

### Vị trí và giá trị trước/sau

| Path / schema / field (JSON Pointer) | Trước | Sau |
|---|---|---|
| `/components/schemas/RoomCreate/required` | ["name"] | ["name","buildingId"] |

**Kiểm tra thủ công:** BE xác nhận lý do, endpoint dùng schema chung, thay đổi role/ownership mô tả bằng văn bản và thời điểm triển khai. FE/Mobile xác nhận tác động với parser và phiên bản client đang hỗ trợ.
