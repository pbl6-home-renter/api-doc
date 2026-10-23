# Báo cáo thay đổi API contract — POC

> Báo cáo tự sinh từ nguồn YAML đã bundle. Không phản ánh việc backend đã triển khai.
> Với fixture, commit chỉ ghi nhận bối cảnh chạy POC, không phải commit đã thay đổi API thật; PR example.invalid là metadata giả lập.

Báo cáo lưu lịch sử các entry đã phát hiện. `NO_CHANGE` không xóa entry cũ; exit code chỉ phản ánh lần chạy hiện tại.

Công cụ: Redocly 2.64.1; oasdiff 1.34.1. Số entry: **2**.

Phân loại: **BREAKING** = client cũ có thể hỏng; **NON_BREAKING** = tương thích theo contract; **NEEDS_REVIEW** = chưa đủ bằng chứng.

Các vị trí dùng JSON Pointer trên bundle tạm (`~1` là `/`). JSON đi kèm giữ toàn bộ semantic diff, fingerprint và hash phục vụ truy vết.

## Fixture breaking: buildingId trở thành bắt buộc — BREAKING

- ID: `3b146ace6a61b0d7cb2af3afd7da4a3a8dae985a6a49c19d5b8bb90b0f17dc53`
- Contract: rentify-public; repository: https://github.com/pbl6-home-renter/api-doc
- Nguồn: `scripts/fixtures/contract-change/base/openapi.yaml` → `scripts/fixtures/contract-change/breaking/openapi.yaml`
- Phát hiện (UTC): 2026-10-22T08:16:17.540Z; commit time: 2026-10-21T22:15:54+07:00
- Commit nền: không áp dụng (fixture/file)
- Commit đích/bối cảnh: [225e1db1672577cfe7a1b9b7919fc51c3370c7f5](https://github.com/pbl6-home-renter/api-doc/commit/225e1db1672577cfe7a1b9b7919fc51c3370c7f5)
- PR: [https://example.invalid/rentify/pull/123](https://example.invalid/rentify/pull/123)
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

## Fixture non-breaking: thêm displayName tùy chọn — NON_BREAKING

- ID: `c5c2b0da86189422cecbac35ed68bb73a4eadfc9bffe0150c1bdcbeba4a4eb0a`
- Contract: rentify-public; repository: https://github.com/pbl6-home-renter/api-doc
- Nguồn: `scripts/fixtures/contract-change/base/openapi.yaml` → `scripts/fixtures/contract-change/non-breaking/openapi.yaml`
- Phát hiện (UTC): 2026-10-22T08:16:17.540Z; commit time: 2026-10-21T22:15:54+07:00
- Commit nền: không áp dụng (fixture/file)
- Commit đích/bối cảnh: [225e1db1672577cfe7a1b9b7919fc51c3370c7f5](https://github.com/pbl6-home-renter/api-doc/commit/225e1db1672577cfe7a1b9b7919fc51c3370c7f5)
- PR: [https://example.invalid/rentify/pull/123](https://example.invalid/rentify/pull/123)
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
