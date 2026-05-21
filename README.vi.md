# Cookie & Storage Toolkit

[English](README.md) | [Tiếng Việt](README.vi.md)

Cookie & Storage Toolkit là browser extension giúp xem, sửa, import, export và migrate cookie, localStorage, sessionStorage ngay trong Side Panel hoặc Sidebar của trình duyệt.

## Screenshots

![Cookie Manager screenshot](store-listing/cookie-manager.png)

![Storage Manager screenshot](store-listing/storage-manager.png)

## Mục Đích

Cookie & Storage Toolkit hỗ trợ developer, tester, QA và đội hỗ trợ kỹ thuật debug browser state nhanh hơn. Bạn có thể xem cookie và web storage của website hiện tại, chỉnh sửa giá trị, chuyển dữ liệu giữa các môi trường và tạo file export sạch mà không cần mở nhiều trang cài đặt hoặc DevTools.

## Chức Năng Chính

- Xem cookie của tab hiện tại, gồm domain, path, value và các flag bảo mật.
- Xem localStorage và sessionStorage của origin hiện tại.
- Lọc cookie theo domain.
- Lọc storage item theo localStorage hoặc sessionStorage.
- Sắp xếp cookie theo tên hoặc giá trị.
- Sắp xếp storage item theo key hoặc value.
- Thêm, sửa và xoá cookie hoặc storage item.
- Xoá nhiều cookie hoặc storage item đã chọn với xác nhận rõ ràng.
- Export cookie đã chọn thành JSON, Netscape Cookie File, JavaScript chạy trong browser console hoặc file `.cmp` được mã hoá.
- Import cookie từ JSON, Netscape Cookie File text, dữ liệu paste trực tiếp hoặc file `.cmp` được mã hoá.
- Export storage item đã chọn thành JSON hoặc JavaScript chạy trong browser console.
- Import storage item từ file JSON hoặc dữ liệu JSON paste trực tiếp.
- Export và import file migration `.mcmp` gồm cả cookie và storage item của website hiện tại.
- Copy cookie name, storage key và value trực tiếp từ từng dòng.
- Hỗ trợ bản build Chrome Side Panel và Firefox Sidebar.

## Yêu Cầu

- Node.js.
- Chrome hoặc trình duyệt Chromium hỗ trợ Manifest V3 và Side Panel.
- Firefox, nếu muốn build bản Firefox.

Repo này không cần cài thêm package npm để build extension.

## Build

Build bản Chrome:

```sh
node scripts/build-extension.js chrome
```

Kết quả nằm tại:

```text
dist/chrome
```

Build bản Firefox:

```sh
node scripts/build-extension.js firefox
```

Kết quả nằm tại:

```text
dist/firefox
```

Build và nén file upload store:

```sh
node scripts/build-extension.js chrome zip
node scripts/build-extension.js firefox zip
```

File zip được tạo tại:

```text
dist/chrome-vx.zip
dist/firefox-vx.zip
```

Tên file zip dùng version hiện tại trong manifest. Build script sẽ xoá zip cũ của cùng target và tạo file upload store sạch, không chứa file ẩn của macOS như `.DS_Store`, `._*` hoặc `__MACOSX`.

## Cài Đặt Unpacked Trên Chrome

1. Build bản Chrome:

```sh
node scripts/build-extension.js chrome
```

2. Mở Chrome và truy cập:

```text
chrome://extensions
```

3. Bật **Developer mode**.
4. Chọn **Load unpacked**.
5. Chọn thư mục:

```text
dist/chrome
```

6. Sau khi cài, nhấn biểu tượng Cookie & Storage Toolkit trên toolbar để mở extension trong Side Panel.

## Cài Đặt Tạm Thời Trên Firefox

1. Build bản Firefox:

```sh
node scripts/build-extension.js firefox
```

2. Mở Firefox và truy cập:

```text
about:debugging#/runtime/this-firefox
```

3. Chọn **Load Temporary Add-on...**.
4. Chọn file:

```text
dist/firefox/manifest.json
```

5. Sau khi cài, mở Cookie & Storage Toolkit từ toolbar hoặc sidebar của Firefox.

Lưu ý: Add-on tạm thời trên Firefox sẽ bị gỡ khi đóng trình duyệt. Cần load lại nếu muốn tiếp tục kiểm thử.

## Cấu Trúc Build

- `manifest.chrome.json`: manifest dùng khi build bản Chrome.
- `manifest.firefox.json`: manifest dùng khi build bản Firefox.
- `src/background`: background script dùng để mở Side Panel hoặc Sidebar.
- `src/sidepanel`: giao diện quản lý cookie, localStorage và sessionStorage.
- `src/assets`: icon và logo của extension.
- `scripts/build-extension.js`: script đóng gói extension vào `dist/chrome` hoặc `dist/firefox`.
- Thêm tham số `zip` hoặc `--zip` để tạo file upload store có version trong thư mục `dist`.

## Tác Giả

- Author: [Hadesker](https://hadesker.dev)
- Email: hello@hadesker.net

## Giấy Phép

Dự án được phát hành theo giấy phép MIT. Xem chi tiết trong file [LICENSE](LICENSE).
