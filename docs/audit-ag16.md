# Kiểm toán toàn diện ứng dụng (`ag-16` — Full App Audit)

Báo cáo rà soát toàn bộ mã nguồn `apps/web/{app,components,lib,hooks}` đối chiếu với `AGENTS.md`, `CLAUDE.md`, `design/IA-v2.md`, `design/UI-RULES.md` (bao gồm §6 Visual character), `docs/02-prd.md`, `docs/05-design-system.md`, `docs/07-api-contract.md`, `docs/nutrient-catalog.md`, `docs/copy-audit-ag11.md`, `docs/audit-ag10.md`, `docs/a11y-audit-ag15.md` và `OPEN_QUESTIONS.md`.

> **Nguyên tắc lọc trùng:** Không lặp lại các mục đã được ghi nhận và xử lý trong `docs/audit-ag10.md`, `docs/a11y-audit-ag15.md`, `docs/copy-audit-ag11.md` hoặc `OPEN_QUESTIONS.md`, ngoại trừ những mục **vẫn chưa được sửa** trong nhánh hiện tại (được đánh dấu rõ *"[Vẫn chưa sửa từ ...]"*).

---

## 1. Bugs (Hành vi sai, trường hợp biên, state/storage, ngày/múi giờ, `null` vs `0`)

### B-01 · `[Must]` · `apps/web/lib/day-history.ts:126-131` & `apps/web/lib/diary-store.tsx:278-315`
**Chế độ tài khoản thật (`?demo=0`) ép các vi chất chưa có dữ liệu (`null`) và đa lượng bỏ trống thành `0` (`0%`)**
- **Bằng chứng:**
  ```ts
  // apps/web/lib/day-history.ts:126-131
  macros: sample.macros.map((m) => ({ ...m, consumed: 0, percentage: 0, displayValue: `0 / ${m.target}${m.unit}` })),
  minerals: sample.minerals.map((m) => ({ ...m, consumed: 0, percentage: 0, statusText: undefined, subLabel: undefined })),
  vitamins: sample.vitamins.map((v) => ({ ...v, consumed: 0, percentage: 0, statusText: undefined, subLabel: undefined })),

  // apps/web/lib/diary-store.tsx:278-291
  const updatedMinerals = base.minerals.map((m) => {
    const extra = extraNutrients[m.key] || 0;
    if (extra === 0) return m;
  ```
- **Tại sao quan trọng:** Vi phạm quy tắc cốt lõi `null ≠ 0` (`design/UI-RULES.md` §3, `HANDOFF.md`). Khi người dùng ngoài chế độ demo thêm một mục `Chỉ thêm kcal` (bỏ trống Đạm/Tinh bột/Chất béo) hoặc thêm một món có vi chất `null` (như Vitamin D, Selen), `computeCompositeDayData` giữ nguyên `consumed: 0` từ `blankDay`. Sau đó `totalsFromDay` (`lib/day-totals.ts:67-85`) thấy `logged === true` nên báo `0 / 15 µg (0% · Thiếu)` cho toàn bộ 22 vi chất trên `/diary`, `/micros` và `/` thay vì `— (Chưa có dữ liệu)`.
- **Đề xuất sửa:** Trong `blankDay()`, đặt `consumed: null, percentage: null, displayValue: "—"` cho `macros`, `minerals`, `vitamins`; trong `computeCompositeDayData()`, chỉ chuyển `consumed` từ `null` sang số khi có ít nhất một mục ghi đóng góp giá trị khác `null` cho chất đó (khớp logic `totalsFromEntries` tại `lib/day-totals.ts:41-53`).

### B-02 · `[Must]` · `apps/web/app/foods/new/page.tsx:92-95`
**Biểu mẫu `Tạo món mới` ép các ô Đạm, Tinh bột, Chất béo để trống thành `0` thay vì `null`**
- **Bằng chứng:**
  ```ts
  // apps/web/app/foods/new/page.tsx:92-95
  const parsedCals = parseFloat(calories.replace(",", ".")) || 0;
  const parsedPro = parseFloat(protein.replace(",", ".")) || 0;
  const parsedCarbs = parseFloat(carbs.replace(",", ".")) || 0;
  const parsedFat = parseFloat(fat.replace(",", ".")) || 0;
  ```
  Trong khi dòng 215 cùng tệp ghi rõ: `"Bỏ trống = chưa có dữ liệu, không phải 0."`
- **Tại sao quan trọng:** Trái ngược trực tiếp với câu hướng dẫn ngay trên màn hình và quy tắc `null ≠ 0`. Ngoài ra `parseFloat` chấp nhận cả số âm (ví dụ `-10`) hoặc hiểu sai dấu chấm phân cách hàng nghìn tiếng Việt (`1.200` thành `1,2`).
- **Đề xuất sửa:** Dùng `parseDecimalInput` từ `@/lib/quick-entry` cho `protein`, `carbs`, `fat` để chuỗi rỗng trả về `null` (và kiểm tra `>= 0`), đồng thời cập nhật kiểu `FoodSearchItem` / `apiClient.createFood` cho phép `number | null`.

### B-03 · `[Must]` · `apps/web/app/(dashboard)/training/page.tsx:236`
**Màn hình `/training` bản máy tính (`≥1024px`) gán cứng `currentSodiumMg={2900}`**
- **Bằng chứng:**
  ```tsx
  // apps/web/app/(dashboard)/training/page.tsx:236
  <SodiumProgressCard saltTarget={saltTarget} currentSodiumMg={2900} />
  ```
- **Tại sao quan trọng:** Trên máy tính, thẻ tiến độ Natri luôn hiển thị `2.900 mg` (`~7,3 g muối`) và trạng thái `"Đạt"` bất kể người dùng đã ăn gì trong ngày hoặc đang ở tài khoản mới (`0 mg`).
- **Đề xuất sửa:** Lấy lượng natri thực tế từ `dayData.minerals.find((m) => m.key === "sodium")?.consumed ?? 0` (từ `useDiary().data` cho hôm nay hoặc `pastDayData(date, demo)` cho ngày cũ) và truyền vào `<SodiumProgressCard>`.

### B-04 · `[Must]` · `apps/web/components/training/sodium-progress-card.tsx:75-77`
**`<SodiumProgressCard>` luôn hiển thị `"Đã đạt mức tối thiểu"` ngay cả khi chưa đạt**
- **Bằng chứng:**
  ```tsx
  // apps/web/components/training/sodium-progress-card.tsx:24, 75-77
  const isAchieved = currentSodiumMg >= saltTarget.sodiumMin;
  ...
  <div className="text-[13px] text-secondary leading-relaxed">
    Đã đạt mức tối thiểu. Mỗi lần ghi muối trong tập sẽ cộng vào đây.
  </div>
  ```
- **Tại sao quan trọng:** Khi `isAchieved` là `false` (ví dụ chọn buổi tập `120 phút` có mức tối thiểu `3.930 mg > 2.900 mg`), nhãn `"Đạt"` ở góc trên biến mất nhưng dòng chữ bên dưới vẫn báo `"Đã đạt mức tối thiểu"`.
- **Đề xuất sửa:** Hiển thị theo điều kiện: `{isAchieved ? "Đã đạt mức tối thiểu. Mỗi lần đánh dấu muối trong buổi tập sẽ cộng vào đây." : \`Còn thiếu ${formatAmount(saltTarget.sodiumMin - currentSodiumMg, "mg")} mg để đạt mức tối thiểu.\`}`.

### B-05 · `[Must]` · `apps/web/lib/training.ts:131, 154, 192, 197`
**`getTrainingPhases()` báo giả `"✓ Đã ghi..."` khi nhật ký trống, và `getRestDayTips()` gán cứng mục tiêu của người mẫu 65 kg**
- **Bằng chứng:**
  ```ts
  // apps/web/lib/training.ts:131, 154
  note: "✓ Đã ghi vào Trước tập",
  note: isFirst ? "✓ Đã ghi 1 g vào nhật ký · chạm để sửa" : "",
  // apps/web/lib/training.ts:192, 197
  text: "Đạm vẫn 104–143 g",
  text: "Năng lượng giữ 1.950–2.275 kcal",
  ```
- **Tại sao quan trọng:** Tài khoản mới chưa ghi món nào vào `/training` vẫn thấy báo `"✓ Đã ghi vào Trước tập"` và `"✓ Đã ghi 1 g vào nhật ký"`. Khi chọn `"Nghỉ"`, người dùng 50 kg vẫn bị khuyên ăn `"Đạm vẫn 104–143 g"` và `"1.950–2.275 kcal"` (mục tiêu của mẫu 65 kg) thay vì mục tiêu tính từ hồ sơ (`calculateTargets(profile)`).
- **Đề xuất sửa:** Truyền `targets` từ `calculateTargets(profile)` vào `getRestDayTips(targets)` để lấy đúng khoảng `targets.protein` và `targets.calories`; chỉ hiển thị `note: "✓ Đã ghi..."` khi mục tương ứng thực sự có trong nhật ký ngày đó.

### B-06 · `[Should]` · `apps/web/app/settings/profile/weight/page.tsx:102`
**Trang sửa cân nặng gắn nhãn `"· giữ nguyên"` sai cho dòng Năng lượng đã được tính lại** *(Vẫn chưa sửa từ `docs/copy-audit-ag11.md` §13)*
- **Bằng chứng:**
  ```tsx
  // apps/web/app/settings/profile/weight/page.tsx:102
  <TargetLine label="Năng lượng" value={`${targetRangeText(preview.calories, "kcal")} · giữ nguyên`} />
  ```
- **Tại sao quan trọng:** `preview.calories` được tính theo cân nặng mới (`30–35 kcal/kg × weightKg`). Khi đổi từ `65 kg` sang `70 kg`, con số nhảy từ `1.950–2.275 kcal` lên `2.100–2.450 kcal` nhưng chữ đi kèm lại khẳng định `"· giữ nguyên"`.
- **Đề xuất sửa:** Bỏ hậu tố ` · giữ nguyên` ở dòng 102 (`value={targetRangeText(preview.calories, "kcal")}`).

### B-07 · `[Should]` · `apps/web/components/diary/diary-screen.tsx:49`
**Thanh đa lượng của ngày cũ hiển thị `"—"` khi giá trị bằng `0` (`m.consumed === 0`)**
- **Bằng chứng:**
  ```tsx
  // apps/web/components/diary/diary-screen.tsx:49
  {past && m.consumed === 0 ? `— / ${m.displayValue.split(" / ")[1] ?? ""}` : m.displayValue}
  ```
- **Tại sao quan trọng:** Nếu ngày cũ có ghi món ăn có `0 g` chất béo hoặc chất xơ (như `Mật mía`), `m.consumed === 0` là giá trị `0` đã biết chứ không phải `null`. Hiển thị `"—"` vi phạm quy tắc `0 ≠ null`.
- **Đề xuất sửa:** Kiểm tra `m.consumed === null` thay vì `past && m.consumed === 0`, và cập nhật `pastDayData` (`lib/diary-store.tsx:338`) tính `macros` từ `totalsFromEntries` để ngày cũ chưa ghi có `consumed: null`.

### B-08 · `[Should]` · `apps/web/app/micros/page.tsx:86-95, 251`
**Gọi thừa `apiClient.getTodayData()` gây trễ 50 ms và có nguy cơ lộ `SAMPLE_DAY` ngoài chế độ demo**
- **Bằng chứng:**
  ```ts
  // apps/web/app/micros/page.tsx:86-95, 251
  useEffect(() => {
    if (past) return;
    apiClient.getTodayData().then((res) => {
      setData(res);
      setIsLoading(false);
    });
  }, [past]);
  ...
  const currentData = pastData || (hydrated ? diaryData : null) || data;
  ```
- **Tại sao quan trọng:** `useDiary()` đã cung cấp sẵn `data: diaryData` và `hydrated`. `apiClient.getTodayData()` luôn trả về `SAMPLE_DAY` sau 50 ms bất kể demo bật hay tắt; nếu `hydrated` chưa bật kịp hoặc `diaryData` rỗng, `currentData` sẽ rơi về `data` (`SAMPLE_DAY`).
- **Đề xuất sửa:** Xoá state `data`, `isLoading` và `useEffect` gọi `apiClient.getTodayData()`; dùng trực tiếp `hydrated` và `diaryData` từ `useDiary()` giống `app/micros/[nutrient]/page.tsx`.

### B-09 · `[Should]` · `apps/web/app/foods/[id]/page.tsx:84` & `apps/web/components/ui/portion-panel.tsx:153, 220`
**Khẩu phần gam tuỳ chỉnh trên trang chi tiết món và `PortionPanel` chưa định dạng số tiếng Việt (`2,5 g`, `1.000 g`)** *(Vẫn chưa sửa hết từ `docs/copy-audit-ag11.md` §3)*
- **Bằng chứng:**
  ```ts
  // apps/web/app/foods/[id]/page.tsx:84
  servingLabel: selectedServingLabel === CUSTOM_PORTION ? `${gramsInput} g` : selectedServingLabel,
  // apps/web/components/ui/portion-panel.tsx:153, 220
  setSelectedServingLabel(`${e.target.value} g`);
  Vi chất trong {gramsInput} g:
  ```
- **Tại sao quan trọng:** Khi người dùng nhập `2.5` hoặc `1000` vào ô gam tuỳ chỉnh ở `/foods/[id]`, nhật ký và thông báo nổi lưu nguyên `"2.5 g"` hoặc `"1000 g"` thay vì `"2,5 g"` / `"1.000 g"`.
- **Đề xuất sửa:** Dùng hàm `formatGramsServingLabel(gramsInput, food.defaultServingGrams)` từ `@/components/foods/serving-label` tại cả hai tệp.

### B-10 · `[Should]` · `apps/web/components/onboarding/setup-form.tsx:151`
**Tiêu đề phụ trên thẻ thiết lập bản máy tính luôn ghi `"Bước 1/2 · Về bạn"` kể cả ở `/setup/goal`**
- **Bằng chứng:**
  ```tsx
  // apps/web/components/onboarding/setup-form.tsx:151
  <span className="text-[13px] font-semibold text-secondary">Bước 1/2 · Về bạn</span>
  ```
- **Tại sao quan trọng:** Ở độ rộng `≥1024px`, khi người dùng mở `/setup/goal`, thẻ vẫn hiển thị `"Bước 1/2 · Về bạn"` không khớp với bước hiện tại.
- **Đề xuất sửa:** Đổi thành `{isProfile ? "Bước 1 / 2 · Về bạn" : "Bước 2 / 2 · Mục tiêu"}`.

---

## 2. Spec Drift (Lệch thiết kế `IA-v2.md`, `UI-RULES.md`, quy tắc sản phẩm)

### S-01 · `[Must]` · `apps/web/components/overview/summary-tab.tsx:72, 78` & `apps/web/components/overview/micro-card.tsx:43`
**Màn hình `/` (`SummaryTab`) hiển thị 2 thẻ nền tối (`TodayHero` và `MicroCard`), vi phạm `design/UI-RULES.md` §6**
- **Bằng chứng:**
  ```tsx
  // apps/web/components/overview/summary-tab.tsx:72, 78
  <TodayHero day={overview.today} nextMeal={nextMeal} />
  ...
  <MicroCard board={board} />
  // apps/web/components/overview/micro-card.tsx:43
  <section id="ov-micro" aria-labelledby="ov-micro-title" className="rounded-xl bg-surface-dark p-4 text-on-dark">
  ```
- **Tại sao quan trọng:** `design/UI-RULES.md` §6 ("Visual character") quy định: *"Dark accent card (`bg-ink`, `text-on-dark`): at most **one** per screen, reserved for the single focal card... Everything else sits on white `--color-card` over `--color-page`."* Việc đặt hai thẻ tối trên cùng một màn hình làm mất điểm nhấn thị giác duy nhất.
- **Đề xuất sửa:** Đổi `<MicroCard>` trong `components/overview/micro-card.tsx:43` sang nền sáng (`rounded-xl border border-card-border bg-card p-4 text-text`), giữ `<TodayHero>` làm thẻ tối duy nhất trên `/`.

### S-02 · `[Should]` · `apps/web/components/foods/entry-editor.tsx:100`, `apps/web/app/(dashboard)/training/page.tsx:161-265`, `apps/web/app/micros/page.tsx:266-380`
**Các màn hình `/entry/[id]`, `/training`, `/micros` không dùng `<AppShell>`; `/entry/[id]` mất thanh điều hướng trái trên máy tính**
- **Bằng chứng:**
  ```tsx
  // apps/web/components/foods/entry-editor.tsx:100-101
  <div data-align-container="entry" className="min-h-screen bg-page text-text flex justify-center">
    <div className="w-full max-w-[390px] lg:max-w-[560px] flex flex-col min-h-screen">
  ```
- **Tại sao quan trọng:** `design/UI-RULES.md` §4 bắt buộc mọi màn hình có điều hướng dùng chung `<AppShell>` (`390 px` trên điện thoại, `240 px` sidebar + `1080 px` nội dung ở `≥1024px`). `/entry/[id]` hoàn toàn không có `<DesktopSidebar>` ở `≥1024px`, còn `/training` và `/micros` tự dựng hai cây DOM riêng biệt (`lg:hidden` và `hidden lg:flex`).
- **Đề xuất sửa:** Bọc `EntryEditor` (`/entry/[id]`), `/training` và `/micros` trong `<AppShell activeTab="diary">`.

---

## 3. Consistency (Thành phần, token màu, thang khoảng cách, chữ hiển thị)

### C-01 · `[Should]` · `apps/web/components/ui/pill-button.tsx:36`, `apps/web/app/settings/notifications/page.tsx:149, 200`, `apps/web/app/settings/delete-account/page.tsx:87`, `apps/web/components/ui/chip.tsx:22`, `apps/web/lib/levels.ts:33-57`
**Sử dụng lớp Tailwind không tồn tại trong `@theme` (`hover:bg-paper`, `hover:bg-surface-tint`), màu `black/*` thô và mã hex cứng trong `lib/levels.ts`**
- **Bằng chứng:**
  ```tsx
  // apps/web/components/ui/pill-button.tsx:36
  secondary: "bg-card text-text border border-card-border hover:bg-paper",
  // apps/web/app/settings/notifications/page.tsx:149
  className="... border border-black/12 bg-card px-2.5 text-[13px] font-semibold text-text hover:bg-surface-tint ..."
  // apps/web/lib/levels.ts:34
  hex: "#C83A3F", trackHex: "#F4DCDD", textHex: "#9F2328",
  ```
- **Tại sao quan trọng:** Trong `app/globals.css`, `@theme` định nghĩa `--color-page` chứ không có `--color-paper` hay `--color-surface-tint`, khiến `hover:bg-paper` và `hover:bg-surface-tint` không tạo ra CSS. Các lớp `border-black/12`, `hover:bg-black/[0.02]` và mã hex trong `lib/levels.ts` vi phạm quy tắc dùng token `@theme` của `AGENTS.md`.
- **Đề xuất sửa:** Đổi `hover:bg-paper` và `hover:bg-surface-tint` thành `hover:bg-page`; đổi `border-black/12` thành `border-card-border`; trong `lib/levels.ts` trả về `var(--color-level-*)`.

### C-02 · `[Should]` · `apps/web/components/training/sodium-progress-card.tsx:25`, `apps/web/app/(dashboard)/training/page.tsx:214`, `apps/web/components/onboarding/auth-shell.tsx:19`, `apps/web/components/ui/form-row.tsx:30`, `apps/web/components/ui/row.tsx:69`
**Khoảng cách nằm ngoài thang chuẩn `4 · 8 · 12 · 16 · 20 · 24 · 32 px` (Tailwind `1, 2, 3, 4, 5, 6, 8`)**
- **Bằng chứng:**
  ```tsx
  // apps/web/components/training/sodium-progress-card.tsx:25
  <section className="bg-surface-dark text-on-dark rounded-xl p-5.5 flex flex-col gap-3.5">
  // apps/web/app/(dashboard)/training/page.tsx:214
  <main className="flex-1 max-w-[1080px] px-8 py-7 flex flex-col gap-5">
  ```
- **Tại sao quan trọng:** Vi phạm quy tắc cứng Layout Rule #1 trong `AGENTS.md` và `design/UI-RULES.md` §2 (chỉ dùng `1, 2, 3, 4, 5, 6, 8`; không dùng `p-5.5` = 22 px, `gap-3.5` = 14 px, `py-7` = 28 px, `pt-11` = 44 px, `gap-1.5` / `py-1.5` = 6 px).
- **Đề xuất sửa:** Đổi `p-5.5 gap-3.5` thành `p-5 gap-3` (hoặc `p-6 gap-4`), `py-7` thành `py-6` hoặc `py-8`, `pt-11` thành `pt-8`, và `1.5` thành `1` hoặc `2`.

---

## 4. Accessibility (Trợ năng)

### A-01 · `[Should]` · `apps/web/components/ui/form-row.tsx:17-45`
**`<FormRow>` hiển thị thông báo lỗi `<span role="alert">` nhưng chưa gắn `id` và `aria-describedby` cho ô nhập liệu**
- **Bằng chứng:**
  ```tsx
  // apps/web/components/ui/form-row.tsx:39-43
  {children}
  {error && (
    <span role="alert" className="text-xs font-semibold text-destructive">
      {error}
    </span>
  )}
  ```
- **Tại sao quan trọng:** Khác với `EmailField` và `PasswordField` (đã có `aria-describedby={`${id}-error`}`), các ô `<input>` đặt trong `<FormRow>` tại `/setup/profile`, `/settings/profile`, `/settings/account`, `/foods/new` và `QuickAddSheet` chỉ có `aria-invalid` mà không liên kết `aria-describedby` tới câu báo lỗi (WCAG 3.3.1).
- **Đề xuất sửa:** Thêm `id={htmlFor ? \`${htmlFor}-error\` : undefined}` vào thẻ `<span role="alert">` trong `FormRow` và truyền `aria-describedby={error ? \`${id}-error\` : undefined}` vào `<input>`.

### A-02 · `[Should]` · `apps/web/app/settings/notifications/page.tsx:146-153, 196-204`
**Các ô chọn giờ `<input type="time">` trên trang `/settings/notifications` thiếu `aria-label`**
- **Bằng chứng:**
  ```tsx
  // apps/web/app/settings/notifications/page.tsx:146-150
  <input
    type="time"
    value={settings[item.timeKey] as string}
    onChange={(e) => updateSetting(item.timeKey, e.target.value as NotificationSettings[typeof item.timeKey])}
    className="peer relative z-10 h-9 min-h-[44px] min-w-[44px] cursor-pointer rounded-md border border-black/12 bg-card px-2.5 text-[13px] font-semibold text-text ..."
  />
  ```
- **Tại sao quan trọng:** `<Row>` hiển thị tên dòng trong `<span>` chứ không phải `<label>`. Trong khi công tắc bật/tắt có `aria-label={item.label}`, ô `<input type="time">` bên cạnh không có `aria-label` nên trình đọc màn hình không biết ô giờ đó thuộc lời nhắc nào (WCAG 4.1.2 / 3.3.2).
- **Đề xuất sửa:** Thêm `aria-label={`Giờ ${item.label.toLowerCase()}`}` vào cả hai thẻ `<input type="time">` ở dòng 148 và 198.

### A-03 · `[Should]` · `apps/web/components/foods/food-search-field.tsx:38` & `apps/web/app/(dashboard)/training/page.tsx:167, 220`
**Nút `Xoá tìm kiếm` thiếu vòng tiêu điểm bàn phím `focus-visible:ring-2`, và `/training` + `/micros` tồn tại 2 thẻ `<h1>` trong DOM** *(Vẫn chưa sửa từ `docs/a11y-audit-ag15.md`)*
- **Bằng chứng:**
  ```tsx
  // apps/web/components/foods/food-search-field.tsx:38
  className="absolute right-0 top-0 h-11 w-11 inline-flex items-center justify-center text-muted hover:text-text rounded-lg"
  ```
- **Tại sao quan trọng:** Khi điều hướng bằng phím `Tab` qua ô tìm kiếm trên `/add` và `/explore`, nút `Xoá tìm kiếm` (`×`) không hiển thị vòng focus (WCAG 2.4.7); đồng thời việc giữ 2 cây DOM mobile/desktop khiến trình đọc màn hình quét thấy 2 thẻ `<h1>` trên `/training` và `/micros`.
- **Đề xuất sửa:** Thêm `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue` vào nút `Xoá tìm kiếm` (`food-search-field.tsx:38`) và gộp header của `/training`, `/micros` qua `<AppHeader>`.

---

## 5. Performance (Client components, re-renders, kích thước gói JS)

### P-01 · `[Should]` · `apps/web/lib/diary-store.tsx:706-742`
**`DiaryContext.Provider` khởi tạo lại object `value={{ ... }}` ở mỗi lần render mà không bọc `useMemo`**
- **Bằng chứng:**
  ```tsx
  // apps/web/lib/diary-store.tsx:706-711
  <DiaryContext.Provider
    value={{
      data: compositeData,
      addedEntries,
      sampleEdits,
      hydrated,
  ```
- **Tại sao quan trọng:** `DiaryProvider` bọc toàn bộ ứng dụng tại `app/layout.tsx:41`. Bất kỳ thay đổi state nhỏ nào (như hiển thị/ẩn `toast` hoặc xoá `highlightedMeal` sau 2 giây) đều tạo tham chiếu object mới và buộc mọi component gọi `useDiary()` render lại toàn bộ.
- **Đề xuất sửa:** Bọc object truyền vào `value` của `DiaryContext.Provider` bằng `useMemo` với danh sách phụ thuộc đầy đủ.

### P-02 · `[Should]` · `apps/web/components/training/rest-day-card.tsx:1`, `apps/web/components/training/salt-summary-card.tsx:1`, `apps/web/components/training/sodium-progress-card.tsx:1`, `apps/web/components/training/training-tip-banner.tsx:1`, `apps/web/components/data-sources/data-source-cards.tsx:1`, `apps/web/components/diary-provider-wrapper.tsx:1`
**Đánh dấu `"use client"` thừa trên 6 component thuần hiển thị không có state hay sự kiện**
- **Bằng chứng:**
  ```tsx
  // apps/web/components/data-sources/data-source-cards.tsx:1
  "use client";
  // apps/web/components/training/rest-day-card.tsx:1
  "use client";
  ```
- **Tại sao quan trọng:** Vi phạm quy tắc trong `AGENTS.md`: *"Server Components by default. Use `'use client'` only where there is state or interaction."* Làm tăng kích thước gói JS phía trình duyệt không cần thiết.
- **Đề xuất sửa:** Xoá dòng `"use client";` ở đầu 6 tệp nêu trên.

### P-03 · `[Nice]` · `apps/web/app/paywall/page.tsx:1` & `apps/web/app/settings/data-sources/page.tsx:1`
**Toàn bộ trang `/paywall` và `/settings/data-sources` phải chạy `"use client"` chỉ để gọi `useBack("/settings")`**
- **Bằng chứng:**
  ```tsx
  // apps/web/app/settings/data-sources/page.tsx:1, 10
  "use client";
  ...
  const back = useBack("/settings");
  ```
- **Tại sao quan trọng:** Cả hai trang chỉ hiển thị nội dung tĩnh nhưng bị kéo toàn bộ vào client bundle chỉ vì truyền `onBack={back}` cho `<AppHeader>`.
- **Đề xuất sửa:** Truyền `backHref="/settings"` vào `<AppHeader>` (giống `TargetsScreen` và `AccountScreen`) và bỏ `"use client"` khỏi hai tệp `page.tsx`.

---

## 6. Security & Privacy (`localStorage`, xác thực mẫu, cô lập dữ liệu tài khoản)

### SP-01 · `[Must]` · `apps/web/lib/storage-keys.ts:25`, `apps/web/lib/profile.ts:18, 111`, `apps/web/lib/settings.ts:1`, `apps/web/lib/training-checklist.ts:7`, `apps/web/lib/api-client.ts:134`, `apps/web/lib/auth-actions.ts:348`
**Rò rỉ dữ liệu sức khoẻ cá nhân giữa các tài khoản trên cùng trình duyệt do `h1t_profile_v1`, `h1t_settings_v1`, `h1t_training_checklist_v1` và `h1t_offline_outbox` không được cô lập theo tài khoản**
- **Bằng chứng:**
  ```ts
  // apps/web/lib/storage-keys.ts:25
  export const ACCOUNT_KEYS: readonly string[] = [ADDED_ENTRIES_KEY, SAMPLE_EDITS_KEY, RECENT_FOODS_KEY, FAVOURITES_KEY, SAVED_MEALS_KEY];
  // apps/web/lib/profile.ts:18, 111
  export const PROFILE_KEY = "h1t_profile_v1";
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
  ```
- **Tại sao quan trọng:** Khi Tài khoản A đăng xuất và Tài khoản B đăng ký/đăng nhập trên cùng trình duyệt, Tài khoản B nhìn thấy toàn bộ giới tính, năm sinh, cân nặng (`weightKg`), trạng thái chu kỳ kinh nguyệt (`periodMode`), tên hiển thị (`displayName`), mục đánh dấu buổi tập và hàng đợi ngoại tuyến của Tài khoản A; đồng thời `readFirstRunFacts()` (`lib/first-run.ts:59`) thấy `h1t_profile_v1` đã tồn tại nên bỏ qua luôn bước thiết lập hồ sơ của Tài khoản B. Ngoài ra `signOut()` (`lib/auth-actions.ts:348`) chưa xoá `sessionStorage` (`h1t-onboarding-draft`, `h1t-pending-email`).
- **Đề xuất sửa:** Đưa `PROFILE_KEY`, `SETTINGS_STORAGE_KEY`, `TRAINING_CHECKLIST_KEY` và `OUTBOX_STORAGE_KEY` vào `ACCOUNT_KEYS` (đọc/ghi qua `keyedStorage(browserLocal(), demo, currentAccountId())`), đồng thời xoá `h1t-onboarding-draft` và `h1t-pending-email` trong `signOut()`.

### SP-02 · `[Should]` · `apps/web/components/onboarding/google-sign-in-button.tsx:12-16`
**`GoogleSignInButton` bỏ qua `signInWithGoogle()` trong `lib/auth-actions.ts` và luôn đăng nhập vào tài khoản mẫu `ban@email.com`**
- **Bằng chứng:**
  ```ts
  // apps/web/components/onboarding/google-sign-in-button.tsx:12-16
  async function handleClick() {
    await apiClient.signInWithGoogle();
    await signInSampleAccount();
    router.push("/setup/profile");
  }
  ```
- **Tại sao quan trọng:** Dù `lib/auth-actions.ts:288` đã cài đặt sẵn `signInWithGoogle()` (gọi `supabase.auth.signInWithOAuth({ provider: "google" })` khi ở chế độ live và chỉ dùng tài khoản mẫu khi ở chế độ mock), nút `"Tiếp tục với Google"` lại tự gọi `signInSampleAccount()` trực tiếp, khiến chế độ live không bao giờ chạy OAuth thật và chế độ thường bị ép đăng nhập vào `ban@email.com`.
- **Đề xuất sửa:** Trong `GoogleSignInButton`, gọi `const res = await signInWithGoogle(); if (res.ok) router.push("/setup/profile");` từ `@/lib/auth-actions`.

---

## 7. Dead Code & Duplication (Mã chết & trùng lặp)

### D-01 · `[Should]` · `apps/web/hooks/use-nutrient-progress.ts:1-90`, `apps/web/components/ui/progress-bar.tsx:1-52`, `apps/web/components/ui/badge.tsx:1-3`, `apps/web/lib/trends.ts:1-97`, `apps/web/lib/mock/trends.ts:1-95`
**5 tệp mã nguồn (337 dòng) không được import ở bất kỳ màn hình hay component nào** *(3 tệp đầu vẫn chưa xoá từ `docs/audit-ag10.md`; 2 tệp `trends.ts` mới phát sinh)*
- **Bằng chứng:**
  ```ts
  // apps/web/hooks/use-nutrient-progress.ts:22-26 (chứa mục tiêu tự bịa trái quy tắc AGENTS.md)
  const DEFAULT_TARGETS: Record<string, { target: number; unit: string }> = {
    calories: { target: 2000, unit: 'kcal' },
    protein: { target: 150, unit: 'g' },
  // apps/web/lib/trends.ts & apps/web/lib/mock/trends.ts (đã được thay thế hoàn toàn bởi lib/overview*.ts)
  ```
- **Tại sao quan trọng:** Gây nhiễu cấu trúc thư mục và `use-nutrient-progress.ts` chứa các giá trị dinh dưỡng tự đặt (`protein: 150`, `carbs: 200`) vi phạm quy tắc sản phẩm trong `AGENTS.md`.
- **Đề xuất sửa:** Xoá 5 tệp `hooks/use-nutrient-progress.ts`, `components/ui/progress-bar.tsx`, `components/ui/badge.tsx`, `lib/trends.ts`, `lib/mock/trends.ts` cùng tệp test `lib/__tests__/trends.test.ts`.

### D-02 · `[Should]` · `apps/web/lib/overview.ts:41-42, 82-83` & `apps/web/lib/period.ts:269-279`
**`buildOverview()` tính toán `changes` (`comparePeriods`) và `insights` (`periodInsights`) ở mọi lần render nhưng không tab nào sử dụng**
- **Bằng chứng:**
  ```ts
  // apps/web/lib/overview.ts:82-83
  changes: comparePeriods(current, previous, targets),
  insights: periodInsights(current, targets, profile),
  ```
- **Tại sao quan trọng:** Từ khi `SummaryTab`, `EnergyTab`, `MicrosTab`, `BodyTab` chuyển sang dùng `lib/overview-board.ts` và `lib/overview-detail.ts`, hai trường `overview.changes`, `overview.insights` và hàm `changeText()` trong `lib/period.ts:269` hoàn toàn không còn được đọc ở bất kỳ component nào nhưng vẫn chạy vòng lặp tính toán mỗi lần render.
- **Đề xuất sửa:** Xoá `changes` và `insights` khỏi `OverviewData` (`lib/overview.ts`) cùng các hàm không còn dùng `comparePeriods`, `periodInsights`, `changeText` trong `lib/period.ts`.

### D-03 · `[Should]` · `apps/web/lib/overview-board.ts:77-82`, `apps/web/lib/nutrient-detail.ts:23-29`, `apps/web/lib/portion.ts:6-13`, `apps/web/lib/quick-entry.ts:9-16`, `apps/web/lib/onboarding.ts:48-55`, `apps/web/lib/api-client.ts:109`
**Trùng lặp hàm đổi thứ trong tuần (`weekdayShort`), hàm phân tích số thập phân (`parseGramsInput` / `parseDecimalInput` / `parseWeightKg`) và `isLiveMode()`**
- **Bằng chứng:**
  ```ts
  // Lặp lại nguyên văn tại lib/overview-board.ts:77-82 và lib/nutrient-detail.ts:23-29:
  const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;
  function weekdayShort(iso: string): string { ... }
  // Lặp lại tại lib/api-client.ts:109 và lib/api-mode.ts:6:
  function isLiveMode(): boolean { return process.env.NEXT_PUBLIC_API_MODE === 'live'; }
  ```
- **Tại sao quan trọng:** Vi phạm quy tắc *"Reuse before you create... no near-duplicates"* trong `AGENTS.md`, dễ dẫn tới lệch hành vi khi sửa một nơi mà quên nơi kia.
- **Đề xuất sửa:** Xuất `weekdayShort` từ `lib/date.ts`, dùng chung một hàm `parseDecimalInput` từ `lib/format.ts` (hoặc `lib/portion.ts`), và import `isLiveMode` từ `lib/api-mode.ts` trong `lib/api-client.ts`.

---

## 8. Test Gaps (Khoảng trống kiểm thử)

### T-01 · `[Must]` · `apps/web/lib/__tests__/day-totals.test.ts` & `apps/web/lib/__tests__/quick-entry-diary.test.ts`
**Thiếu unit test kiểm tra luồng `blankDay(SAMPLE_DAY)` → `computeCompositeDayData()` → `totalsFromDay()` cho tài khoản thật (`?demo=0`)**
- **Bằng chứng:**
  ```ts
  // apps/web/lib/__tests__/quick-entry-diary.test.ts:18-48
  // Chỉ gọi trực tiếp totalsFromEntries([entry]) mà không đi qua blankDay() + computeCompositeDayData() + totalsFromDay()
  ```
- **Tại sao quan trọng:** Vì unit test chỉ kiểm tra `totalsFromEntries()` tách rời mà không kiểm tra luồng dữ liệu thực tế của `DiaryProvider` trên `blankDay(SAMPLE_DAY)`, lỗi nghiêm trọng **B-01** (biến toàn bộ vi chất `null` và đa lượng bỏ trống thành `0`) đã lọt qua bộ test.
- **Đề xuất sửa:** Bổ sung test trong `lib/__tests__/day-totals.test.ts` kiểm tra `totalsFromDay(computeCompositeDayData(blankDay(SAMPLE_DAY), [quickEntry], {}, [], DEFAULT_PROFILE))` trả về `null` (không phải `0`) cho các đa lượng bỏ trống và các vi chất chưa có dữ liệu.

### T-02 · `[Should]` · `apps/web/lib/__tests__/storage-keys.test.ts` & `apps/web/lib/__tests__/profile.test.ts`
**Thiếu unit test kiểm tra cô lập dữ liệu giữa hai tài khoản cho `profile`, `settings` và `training-checklist`**
- **Bằng chứng:**
  ```ts
  // apps/web/lib/__tests__/storage-keys.test.ts:10
  expect(ACCOUNT_KEYS).toEqual([ADDED_ENTRIES_KEY, SAMPLE_EDITS_KEY, RECENT_FOODS_KEY, FAVOURITES_KEY, SAVED_MEALS_KEY]);
  ```
- **Tại sao quan trọng:** Bộ test chỉ kiểm tra 5 khoá nhật ký/món ăn, bỏ sót hoàn toàn việc kiểm tra cô lập hồ sơ sức khoẻ (`PROFILE_KEY`), cài đặt nhắc nhở (`SETTINGS_STORAGE_KEY`) và danh sách đánh dấu buổi tập (`TRAINING_CHECKLIST_KEY`) khi đổi tài khoản (lỗi **SP-01**).
- **Đề xuất sửa:** Thêm kịch bản test đăng nhập Tài khoản A → lưu hồ sơ/nhắc nhở/tick buổi tập → đăng xuất → đăng nhập Tài khoản B trong `lib/__tests__/profile.test.ts` và `lib/__tests__/storage-keys.test.ts`.

### T-03 · `[Should]` · `apps/web/lib/target-rows.ts` & `apps/web/components/foods/serving-label.ts`
**Thiếu tệp unit test cho `lib/target-rows.ts` và `components/foods/serving-label.ts`**
- **Bằng chứng:**
  ```ts
  // apps/web/lib/target-rows.ts:9-40 (targetRangeText, buildTargetGroups)
  // apps/web/components/foods/serving-label.ts:8-15 (formatGramsServingLabel)
  ```
- **Tại sao quan trọng:** `target-rows.ts` chịu trách nhiệm định dạng toàn bộ 22 mục tiêu ngày và chú thích trên `/settings/targets`, còn `serving-label.ts` chuẩn hoá nhãn gam tiếng Việt (`2,5 g`, `1.000 g`), nhưng cả hai chưa có tệp unit test tương ứng trong `lib/__tests__/`.
- **Đề xuất sửa:** Chuyển `formatGramsServingLabel` vào `lib/portion.ts` (kèm test trong `lib/__tests__/portion.test.ts`) và tạo `lib/__tests__/target-rows.test.ts`.

---

## 9. Top 10 vấn đề ưu tiên cao nhất theo mức độ ảnh hưởng người dùng (Top-10 by User Impact)

1. **[Must · B-01] Chế độ tài khoản thật (`?demo=0`) biến mọi vi chất chưa biết (`null`) và đa lượng bỏ trống thành `0` (`0% · Thiếu`)** (`lib/day-history.ts:126-131`, `lib/diary-store.tsx:278-315`) — Làm sai lệch toàn bộ bảng 22 vi chất và điểm trung bình kỳ của người dùng thật ngay khi vừa ghi món đầu tiên.
2. **[Must · SP-01] Hồ sơ sức khoẻ (`h1t_profile_v1`), cài đặt nhắc nhở và tick buổi tập không được cô lập theo tài khoản** (`lib/profile.ts:18`, `lib/storage-keys.ts:25`, `lib/auth-actions.ts:348`) — Người dùng thứ hai đăng nhập trên cùng trình duyệt bị bỏ qua bước thiết lập hồ sơ và nhìn thấy thông tin cơ thể/chu kỳ kinh nguyệt của người dùng trước.
3. **[Must · B-02] Biểu mẫu `Tạo món mới` (`/foods/new`) lưu `0` thay vì `null` khi bỏ trống Đạm, Tinh bột, Chất béo** (`app/foods/new/page.tsx:92-95`) — Trái ngược trực tiếp với câu hướng dẫn trên màn hình (`"Bỏ trống = chưa có dữ liệu, không phải 0"`) và làm sai tổng đa lượng trong ngày.
4. **[Must · B-03 & B-04] Màn hình `/training` bản máy tính gán cứng `currentSodiumMg={2900}` và `<SodiumProgressCard>` luôn báo `"Đã đạt mức tối thiểu"`** (`app/(dashboard)/training/page.tsx:236`, `components/training/sodium-progress-card.tsx:75-77`) — Báo sai lượng muối đã nạp và trạng thái đạt mục tiêu trong ngày tập.
5. **[Must · B-05] `/training` hiển thị `"✓ Đã ghi..."` khi nhật ký trống và hiển thị cứng mục tiêu của mẫu 65 kg (`104–143 g` đạm, `1.950–2.275 kcal`) trong ngày nghỉ** (`lib/training.ts:131, 154, 192, 197`) — Đưa thông tin mục tiêu sai với cân nặng/mục tiêu thực của người dùng.
6. **[Must · S-01] Màn hình `/` (`SummaryTab`) có 2 thẻ nền tối (`TodayHero` và `MicroCard`)** (`components/overview/summary-tab.tsx:72, 78`, `components/overview/micro-card.tsx:43`) — Vi phạm quy tắc thị giác `design/UI-RULES.md` §6 (tối đa 1 thẻ tối làm điểm nhấn trên mỗi màn hình).
7. **[Must · T-01] Thiếu unit test cho luồng `blankDay` → `computeCompositeDayData` → `totalsFromDay`** (`lib/__tests__/day-totals.test.ts`) — Khiến lỗi `null` bị ép thành `0` ở chế độ tài khoản thật không được phát hiện tự động.
8. **[Should · B-06] Trang sửa cân nặng (`/settings/profile/weight`) gắn chữ `"· giữ nguyên"` vào dòng Năng lượng vừa thay đổi** (`app/settings/profile/weight/page.tsx:102`) — Gây hiểu nhầm cho người dùng khi đổi cân nặng.
9. **[Should · SP-02] Nút `"Tiếp tục với Google"` bỏ qua `signInWithGoogle()` và luôn đăng nhập vào tài khoản mẫu `ban@email.com`** (`components/onboarding/google-sign-in-button.tsx:12-16`) — Ngăn luồng OAuth thật khi chạy `NEXT_PUBLIC_API_MODE=live`.
10. **[Should · S-02 & A-03] `/entry/[id]` thiếu `<AppShell>` / `<DesktopSidebar>` trên máy tính, `/training` và `/micros` nhân đôi `<h1>`, nút `Xoá tìm kiếm` thiếu vòng focus** (`components/foods/entry-editor.tsx:100`, `app/(dashboard)/training/page.tsx:167, 220`, `components/foods/food-search-field.tsx:38`) — Làm giảm tính đồng nhất bố cục desktop và khả năng truy cập bằng bàn phím/trình đọc màn hình.
