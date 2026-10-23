# Báo cáo thay đổi API contract

> Báo cáo tự sinh từ nguồn YAML đã bundle. Không phản ánh việc backend đã triển khai.
> Entry fixture/file chỉ ghi commit làm bối cảnh chạy, không phải commit đã thay đổi API thật.

Báo cáo lưu lịch sử các entry đã phát hiện, mới nhất ở trên. `NO_CHANGE` không xóa entry cũ; exit code chỉ phản ánh lần chạy hiện tại.

Công cụ: Redocly 2.64.1; oasdiff 1.34.1. Số entry: **1**.

Phân loại: **BREAKING** = client cũ có thể hỏng; **NON_BREAKING** = tương thích theo contract; **NEEDS_REVIEW** = chưa đủ bằng chứng.

Các vị trí dùng JSON Pointer trên bundle tạm (`~1` là `/`). JSON đi kèm giữ toàn bộ semantic diff, fingerprint và hash phục vụ truy vết.

## Thay đổi contract từ Git — BREAKING

- ID: `fc8b7801fb3101f38f9c323e0b877e6aa00be86480705ed1ca567f9c9e690ec9`
- Contract: rentify-public; repository: https://github.com/pbl6-home-renter/api-doc
- Nguồn: `src/openapi.yaml` → `src/openapi.yaml`
- Phát hiện (UTC): 2026-10-23T16:46:01.931Z; commit time: 2026-10-23T23:45:49+07:00
- Commit nền: a6902e51ec6756c91f4e6d997417a30bcd46add0
- Commit đích/bối cảnh: [d76f3b216e930786ef35c042844e3edca1dae15c](https://github.com/pbl6-home-renter/api-doc/commit/d76f3b216e930786ef35c042844e3edca1dae15c)
- PR: [https://github.com/pbl6-home-renter/api-doc/pull/13](https://github.com/pbl6-home-renter/api-doc/pull/13)
- Loại metadata: Git revision thực tế
- Lý do: Test workflow: giới hạn note duyệt tòa nhà còn 200 ký tự.

| Mức ảnh hưởng | Endpoint / vùng | Thay đổi | Hành động FE / Mobile |
|---|---|---|---|
| BREAKING | POST /buildings/{buildingId}/approve | the `note` request property's maxLength was decreased to `200` (`request-property-max-length-decreased`) | FE và Mobile: đối chiếu vị trí và thay đổi trước/sau trong entry này với API adapter, DTO, parser và validation; cùng BE xác nhận phương án tương thích trước merge/phát hành. |
| NON_BREAKING | info | Đã phát hiện breaking change nhưng info.version vẫn là `1.0.0`. (`api-version-not-bumped`) | BE: xem lại quy ước version trước khi chấp nhận breaking change. FE/Mobile: theo kế hoạch chuyển đổi của entry này; version trong OpenAPI chưa chứng minh backend đã triển khai. |

### Vị trí và giá trị trước/sau

| Path / schema / field (JSON Pointer) | Trước | Sau |
|---|---|---|
| `/components/schemas/BuildingApproveRequestDto/properties/note/maxLength` | 500 | 200 |

**Kiểm tra thủ công:** BE xác nhận lý do, endpoint dùng schema chung, thay đổi role/ownership mô tả bằng văn bản và thời điểm triển khai. FE/Mobile xác nhận tác động với parser và phiên bản client đang hỗ trợ.
